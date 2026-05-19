<!--
 * @Author       : Chang xd
 * @Date         : 2026-05-12 17:09:16
 * @LastEditors  : Chang xd
 * @LastEditTime : 2026-05-12 17:09:21
 * @Description  : 
-->
# 报告接口文档

本文档说明报告相关接口：
- `POST /report`：生成报告
- `GET /api/reports`：获取报告列表
- `DELETE /api/reports/{report_id}`：删除报告

## 1. 获取报告列表

### 接口概览

用于查询已经生成并持久化保存的报告列表。普通用户只能查看自己的报告；管理员可以查看全部报告，或按指定 `user_id` 查询某个用户的报告。

### 请求信息

| 项目 | 内容 |
| --- | --- |
| 方法 | `GET` |
| 路径 | `/api/reports` |
| 鉴权 | `Authorization: Bearer <token>` |
| 请求头 | 无特殊要求 |
| 返回类型 | `application/json` |

### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `user_id` | `string` | 否 | 当前登录用户 | 管理员可选传，用于查询指定用户的报告；普通用户传入其他用户 ID 会返回 `403` |

### 权限规则

- 普通用户：
  - 不传 `user_id` 时，只返回自己的报告
  - 传入自己的 `user_id` 时，仍只返回自己的报告
  - 传入其他人的 `user_id` 时，返回 `403`
- 管理员：
  - 不传 `user_id` 时，返回全部报告
  - 传入 `user_id` 时，返回该用户的报告

### 请求示例

不传参数，获取当前用户报告：

```http
GET /api/reports HTTP/1.1
Authorization: Bearer <token>
```

管理员按用户查询：

```http
GET /api/reports?user_id=sc_1 HTTP/1.1
Authorization: Bearer <token>
```

### 成功响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "reports": [
      {
        "report_id": "report_8bff3f4ef3df4c9996cf788d4c6c38d7",
        "user_id": "sc_1",
        "username": "admin",
        "title": "2024年上城区道路病害年度报告",
        "request_input": "生成2024年上城区病害报告",
        "year": "2024",
        "region": "上城区",
        "filename": "2024年上城区地下病害年度报告_20260512_154644_424795.pdf",
        "download_url": "http://example.com/files/reports/2024年上城区地下病害年度报告_20260512_154644_424795.pdf",
        "file_type": ".pdf",
        "file_size": 1827364,
        "status": "generated",
        "created_at": "2026-05-12T15:46:44.424795+08:00",
        "updated_at": "2026-05-12T15:46:44.424795+08:00"
      }
    ]
  }
}
```

### 响应字段说明

顶层字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `code` | `integer` | 业务状态码，成功固定为 `200` |
| `message` | `string` | 响应描述，成功固定为 `success` |
| `data.reports` | `array` | 报告列表 |

`data.reports[]` 字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `report_id` | `string` | 报告唯一 ID，用于删除等后续操作 |
| `user_id` | `string` | 报告所属用户 ID |
| `username` | `string \| null` | 报告所属用户名 |
| `title` | `string` | 报告标题 |
| `request_input` | `string \| null` | 生成报告时的原始输入 |
| `year` | `string` | 报告年份 |
| `region` | `string` | 报告区域 |
| `filename` | `string` | 文件名 |
| `download_url` | `string` | 报告下载链接 |
| `file_type` | `string` | 文件扩展名，如 `.pdf`、`.md` |
| `file_size` | `integer \| null` | 文件大小，单位字节 |
| `status` | `string` | 报告状态，当前固定为 `generated` |
| `created_at` | `string \| null` | 创建时间，ISO 8601 格式 |
| `updated_at` | `string \| null` | 更新时间，ISO 8601 格式 |

### 失败响应

#### 1. 未登录或 token 无效

```json
{
  "detail": "invalid token"
}
```

状态码：`401`

#### 2. 普通用户越权查看其他用户报告

```json
{
  "detail": "只能查看自己的报告"
}
```

状态码：`403`

## 2. 生成报告

### 接口概览

独立报告生成接口，直接触发年度报告生成，不经过 `/chat_stream_tokens` 的对话流。

### 请求信息

| 项目 | 内容 |
| --- | --- |
| 方法 | `POST` |
| 路径 | `/report` |
| 鉴权 | `Authorization: Bearer <token>` |
| 请求头 | `Content-Type: application/json` |
| 返回类型 | `text/event-stream` |

### 请求体

支持两种传参方式，满足其一即可：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `input` | `string` | 否 | `null` | 自然语言报告需求，例如“生成2024年上城区病害报告” |
| `year` | `string` | 否 | `null` | 报告年份；通常与 `region` 配套使用 |
| `region` | `string` | 否 | `null` | 报告区域；通常与 `year` 配套使用 |
| `stream_tokens` | `boolean` | 否 | `true` | 是否返回报告生成进度文本 |

方式一：直接传 `input`

```json
{
  "input": "生成2024年上城区病害报告",
  "stream_tokens": true
}
```

方式二：显式传 `year` 和 `region`

```json
{
  "year": "2024",
  "region": "上城区",
  "stream_tokens": true
}
```

参数校验规则：

- `input` 非空时可直接生成报告
- 如果不传 `input`，则必须同时传 `year` 和 `region`
- 两种方式都不满足时，返回 `400`，错误信息为 `report requires either {input} or {year, region}`

### SSE 事件协议

响应头固定包含：

- `Cache-Control: no-cache`
- `Connection: keep-alive`
- `X-Accel-Buffering: no`

#### 1. `token`

报告生成中的进度文本事件，仅在 `stream_tokens=true` 时持续输出。

```json
{
  "type": "token",
  "content": "{title: '🚀 开始并行生成 2024年上城区 报告...',description: ' ',}"
}
```

#### 2. `done`

报告生成成功后的结束事件。

```json
{
  "type": "done",
  "download_url": "http://example.com/files/reports/2024年上城区地下病害年度报告_xxx.pdf",
  "filename": "2024年上城区地下病害年度报告_xxx.pdf",
  "report_id": "report_8bff3f4ef3df4c9996cf788d4c6c38d7"
}
```

字段说明：

- `download_url`：最终报告下载地址
- `filename`：最终文件名
- `report_id`：报告持久化记录 ID；当元数据保存成功时返回
- `persist_error`：如果文件已生成但元数据落库失败，事件中会额外返回该字段

#### 3. `error`

报告生成异常时返回。

```json
{
  "type": "error",
  "message": "异常信息",
  "traceback": "完整堆栈"
}
```

## 3. 删除报告

### 接口概览

删除指定报告。会同时删除数据库中的报告记录和 `static/reports` 下对应的本地文件。

### 请求信息

| 项目 | 内容 |
| --- | --- |
| 方法 | `DELETE` |
| 路径 | `/api/reports/{report_id}` |
| 鉴权 | `Authorization: Bearer <token>` |
| 返回类型 | `application/json` |

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `report_id` | `string` | 是 | 报告唯一 ID |

### 权限规则

- 普通用户只能删除自己的报告
- 管理员可以删除任意报告

### 请求示例

```http
DELETE /api/reports/report_8bff3f4ef3df4c9996cf788d4c6c38d7 HTTP/1.1
Authorization: Bearer <token>
```

### 成功响应示例

```json
{
  "code": 200,
  "message": "deleted",
  "data": {
    "report_id": "report_8bff3f4ef3df4c9996cf788d4c6c38d7",
    "filename": "2024年上城区地下病害年度报告_20260512_154644_424795.pdf",
    "download_url": "http://example.com/files/reports/2024年上城区地下病害年度报告_20260512_154644_424795.pdf",
    "file_type": ".pdf",
    "file_existed": true,
    "file_deleted": true
  }
}
```

### 失败响应

#### 1. 报告不存在

```json
{
  "detail": "report not found"
}
```

状态码：`404`

#### 2. 普通用户越权删除其他用户报告

```json
{
  "detail": "只能删除自己的报告"
}
```

状态码：`403`
