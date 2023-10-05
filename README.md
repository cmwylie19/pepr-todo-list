# Todos

Cloud Native Todolist implementation using Pepr showcasing _Watch_ and _Store_.

## Usage

Quick Start:

```bash
k3d cluster delete; k3d cluster create; npx pepr dev --confirm
```

Get todo list:

```bash
alias todolist="k get secret todos -n todolist -ojsonpath='{.data.list}' | base64 -d | jq"
```

Create the namespace:

```bash
k create ns todolist
```

Create a Todo item:

Add milk to the todolist...

```bash
k create cm -n todolist milk \
--from-literal=status="incomplete" \
--from-literal=task="Buy milk"
```

Add coffee to the todolist...

```bash 
k create cm -n todolist coffee \
--from-literal=status="incomplete" \
--from-literal=task="Buy coffee"
```

Add sugar to the todolist...

```bash
k create cm -n todolist sugar \
--from-literal=status="incomplete" \
--from-literal=task="Buy sugar"
```

Add gum to the todolist...

```bash
k create cm -n todolist gum \
--from-literal=status="incomplete" \
--from-literal=task="Buy gum"
```

Mark coffee as complete:

```yaml
k apply -f -<<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  creationTimestamp: null
  name: milk
  namespace: todolist
data:
  status: complete
  task: Buy milk
EOF
```

Add eggs to the todolist...

```bash
k create cm -n todolist eggs \
--from-literal=status="incomplete" \
--from-literal=task="Buy eggs"
```


