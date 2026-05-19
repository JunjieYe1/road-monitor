# `/chat_stream_tokens` 接口文档

## 接口概述

主聊天流式接口，基于 SSE 返回主智能体的增量回复，同时支持：

- 新会话首条消息自动生成标题
- 基于 `message_id` 的续写/重答
- 报告生成进度透传
- 地图点位结构化返回
- 知识库引用结构化返回

## 请求信息

| 项目 | 内容 |
| --- | --- |
| 方法 | `POST` |
| 路径 | `/chat_stream_tokens` |
| 鉴权 | `Authorization: Bearer <token>` |
| 请求头 | `Content-Type: application/json` |
| 返回类型 | `text/event-stream` |

## 请求体

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `message` | `string` | 是 | 无 | 用户输入内容 |
| `thread_id` | `string` | 否 | `user_session_1` | 会话标识；后端会自动拼接当前用户前缀 |
| `message_id` | `string` | 否 | 无 | 已存在逻辑消息 ID；传入后进入重答/续写流程 |
| `stream_report_tokens` | `boolean` | 否 | `true` | 是否把报告工具的进度文本按 `token` 事件透传 |
| `skills_list` | `string[]` | 否 | `null` | 本轮允许使用的技能/工具约束 |

新开一轮对话示例：

```json
{
  "message": "帮我分析 2025 年上城区道路病害情况",
  "thread_id": "session_001",
  "stream_report_tokens": true,
  "skills_list": ["tool_basics", "sql_search"]
}
```

基于 `message_id` 重答示例：

```json
{
  "message": "请换一种更简洁的方式重答",
  "message_id": "sc_1_user_session_1_20260428153000"
}
```

## skills_list:
- 'tool_basics' :工具设定提示词，默认必传
- 'get_current_time' :获取当前具体时间,默认必传
- 'sql_search': 查询数据库的技能  路小析、路小规 携带
- 'ragflow_search': 查询知识库的技能  路小规、路小策 携带
- 'map_control': 查询数据库之后输出特殊type卡片的技能  路小析、路小规 携带
- 'rag_control': 查询知识库之后输出特殊type卡片的技能  路小规、路小策 携带


## 请求处理规则

- 未传 `message_id` 时，后端会创建新一轮消息，`group_id` 固定从 `1` 开始。
- 传入 `message_id` 时，后端会先按当前登录用户查询该消息所属会话。
- `message_id` 不存在时返回 `404`，错误信息为 `message_id not found`。
- 同时传了 `message_id` 和 `thread_id` 时，两者必须指向同一会话，否则返回 `400`，错误信息为 `thread_id does not match message_id`。
- 后端会先预留一条 `user` 消息和一条 `assistant` 占位消息，再开始 SSE 推流。
- 如果当前会话是第一次发消息，会额外发送一次 `title` 事件。

## SSE 事件协议

接口响应头固定包含：

- `Cache-Control: no-cache`
- `Connection: keep-alive`
- `X-Accel-Buffering: no`

### 1. 首包：消息绑定信息

这个事件一定最先返回，且没有 `type` 字段。

```json
{
  "id_user": 101,
  "id_assistant": 102,
  "message_id": "sc_1_user_session_1_20260428153000",
  "group_id": 1
}
```

字段说明：

- `id_user`：用户消息在 `messages` 表中的主键
- `id_assistant`：assistant 占位消息在 `messages` 表中的主键
- `message_id`：一轮问答共享的逻辑消息 ID
- `group_id`：同一 `message_id` 下的版本号；重答时会递增

### 2. `title`

只在“新会话第一条消息”时出现。

```json
{
  "type": "title",
  "content": "帮我分析 2025 年上城区道路病害情况"
}
```

### 3. `token`

标准文本增量事件。来源有两类：

- 主智能体最终回复的增量文本
- 报告工具的进度文本（仅当 `stream_report_tokens=true`）

```json
{
  "type": "token",
  "content": "增量文本片段"
}
```

说明：

- `content` 是分片文本，不保证按完整句子切分。
- 前端应按收到顺序持续拼接。

### 4. `deepthought`

工具调用中的状态提示事件，当前用于提示正在执行哪类查询。

```json
{
  "type": "deepthought",
  "content": "正在查询数据库\n"
}
```

当前实现中可稳定看到的内容包括：

- `正在查询数据库\n`
- `正在查询知识库\n`
- `正在获取当前时间\n`

### 5. `map_control`

当本轮最终输出被路由到地图工具时返回。

```json
{
  "type": "map_control",
  "data": {
    "count": 2,
    "items": [
      {
        "disease_name": "xx路",
        "disease_category": "脱空",
        "disease_level": "高",
        "longitude": 120.123,
        "latitude": 30.123
      }
    ],
    "disease_proportion": [
      {
        "disease_category": "脱空",
        "proportion": 1.0,
        "disease_count": 2
      }
    ]
  }
}
```

字段说明：

- `count`：点位总数
- `items`：地图点位明细
- `disease_proportion`：按病害类别聚合后的数量和占比

`items` 中每一项固定包含：

```json
{
  "disease_name": "病害名称或道路名称",
  "disease_category": "病害类别",
  "disease_level": "病害等级",
  "longitude": 120.123,
  "latitude": 30.123
}
```

### 6. `rag_control`

当本轮最终输出被路由到知识库引用整理工具时返回。

```json
{
  "type": "rag_control",
  "data": [
    {
      "filename": "xx.pdf",
      "chunk_content": "原文分块内容",
      "filepage": 12,
      "fileurl": "http://example.com/xx.pdf#page=12"
    }
  ]
}
```

`data` 是数组，每一项固定包含：

```json
{
  "filename": "原文件名",
  "chunk_content": "分块内容",
  "filepage": 12,
  "fileurl": "原文链接"
}
```

### 7. `done`

流正常结束时返回。

```json
{
  "type": "done",
  "message_id": "sc_1_user_session_1_20260428153000",
  "group_id": 1
}
```

### 8. `error`

流式执行异常时返回。

```json
{
  "type": "error",
  "message": "异常信息",
  "traceback": "完整堆栈",
  "message_id": "sc_1_user_session_1_20260428153000",
  "group_id": 1
}
```

