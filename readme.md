# wait-umi

> 等待 umi 服务启动

可可用于 umijs 服务启动判断，通常在需要等待站点启动后运行 e2e 测试。

## usage

```json
{
  "scripts": {
    "start": "umi dev",
    "test:e2e": "cypress run",
    "test": "wait-umi :8000 && test:e2e"
  },
  "devDependencies": {
    "wait-umi": "*"
  }
}
```

同样的，他适用于 dumi 服务.

```diff
{
  "scripts": {
-    "start": "umi dev",
+    "start": "dumi dev",
    "test:e2e": "cypress run",
    "test": "wait-umi :8000 && test:e2e"

```
