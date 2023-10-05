import { Capability, K8s, Log, a, kind } from "pepr";

export const TodoList = new Capability({
  name: "todo-list",
  description:
    "A cloud native todolist capability for Pepr using Watch and Store.",
  namespaces: ["todolist"],
});

// Use the 'When' function to create a new action, use 'Store' to persist data
const { When, Store } = TodoList;


interface IStoreMap {
  [key: string]: {
    task: string;
    status: string;
  };
}

let preStoreCache: IStoreMap = {};
let storeReady = false;

const localStoreEmpty = (preStoreCache: IStoreMap): boolean =>
  Object.keys(preStoreCache).length === 0;

const combineStore = (a: IStoreMap, b: IStoreMap): IStoreMap => {
  const combinedStore: IStoreMap = { ...a };

  // store b overwrites store a
  for (const key in b) {
    if (b.hasOwnProperty(key)) {
      combinedStore[key] = b[key];
    }
  }

  return combinedStore;
};

/**
 * ---------------------------------------------------------------------------------------------------
 *                                   Watch Action with K8s SSA (ConfigMap)                           *
 * ---------------------------------------------------------------------------------------------------
 *
 * This action watches for ConfigMaps to be created or updated, adds or updates the ConfigMap data
 * as an item in the TodoList.
 */

When(a.ConfigMap)
  .IsCreatedOrUpdated()
  .InNamespace("todolist") // this is redudant because I have specified the namespaces in the Capability ^^^
  .Watch(async (cm, phase) => {
    Log.info(`ConfigMap ${cm.metadata.name} was ${phase}.`);
    let storeMap: IStoreMap;
    // Add new todo from ConfigMap
    if (cm.data && cm.data.hasOwnProperty("task")) {
      if (storeReady) {
        // transfer store to map
        storeMap = JSON.parse(Store.getItem("todolist"));
        if (storeMap === null) {
          storeMap = {};
        }

        // transfer preStoreCache to Store and empty preStoreCache
        if (!localStoreEmpty(preStoreCache)) {
          storeMap = combineStore(preStoreCache, storeMap);
          preStoreCache = {};
        }

        storeMap[cm.data["task"]] = {
          task: cm.data["task"],
          status: cm.data["status"],
        };

        Store.setItem("todolist", JSON.stringify(storeMap));
      } else {
        preStoreCache[cm.data["task"]] = {
          task: cm.data["task"],
          status: cm.data["status"],
        };
      }

      // Apply todolist in the Secret using K8s server-side apply
      if (storeReady) {
        try {
          await K8s(kind.Secret).Apply({
            metadata: {
              name: "todos",
              namespace: "todolist",
            },
            stringData: {
              list: JSON.stringify(storeMap),
            },
          });
        } catch (err) {
          Log.error(err, "Error applying todolist to Secret");
        }
      }
    }
  });

/**
 * ---------------------------------------------------------------------------------------------------
 *                                   Watch Action with K8s SSA (ConfigMap)                           *
 * ---------------------------------------------------------------------------------------------------
 *
 * This action watches for ConfigMaps to be deleted, and deletes the ConfigMap data
 * from the TodoList.
 */

When(a.ConfigMap)
  .IsDeleted()
  .InNamespace("todolist") // this is redudant because I have specified the namespaces in the Capability ^^^
  .Watch(async (cm, phase) => {
    Log.info(`ConfigMap ${cm.metadata.name} was ${phase}.`);
    let storeMap: IStoreMap;

    if (cm.data && cm.data.hasOwnProperty("task")) {
      if (storeReady) {
        // transfer store to map
        storeMap = JSON.parse(Store.getItem("todolist"));
        if (storeMap === null) {
          storeMap = {};
        }

        // transfer preStoreCache to Store and empty preStoreCache
        if (!localStoreEmpty(preStoreCache)) {
          storeMap = combineStore(storeMap, preStoreCache);
          preStoreCache = {};
        }

        // delete todo from ConfigMap
        delete storeMap[cm.data["task"]];
        Store.setItem("todolist", JSON.stringify(storeMap));
      } else {
        delete preStoreCache[cm.data["task"]];
      }

      // Apply the Secret using K8s server-side apply
      if (storeReady) {
        try {
          await K8s(kind.Secret).Apply({
            metadata: {
              name: "todos",
              namespace: "todolist",
            },
            stringData: {
              list: JSON.stringify(storeMap),
            },
          });
        } catch (err) {
          Log.error(err, "Error applying todolist to Secret");
        }
      }
    }
  });

/**
 * A callback function that is called once the Pepr Store is fully loaded.
 */
Store.onReady(data => {
  storeReady = true;
  Log.info(data, "Pepr Store Ready");
});
