**4. RAG 文档同步上传
接口地址：POST /ragflow/upload
Content-Type：multipart/form-data
功能说明：上传一个或多个文件到 RAGFlow 数据集。默认只上传，不自动提交解析；如需上传后立即提交解析，传 parse=true。
参数名	位置	类型	必填	默认值	说明
Authorization	Header	string	是	-	Bearer token。
file	Form-Data	file[]	是	-	待上传文件，可传多个同名 file 字段。
dataset_id	Form-Data	string	否	空	指定 RAGFlow 数据集 ID，为空则指向默认测试数据集
parse	Form-Data	bool	否	false	是否在上传成功后提交 RAGFlow 解析。

curl.exe -X POST "http://47.114.93.164:8000/ragflow/upload" ^
  -H "Authorization: Bearer <access_token>" ^
  -F "file=@D:\\files\\demo.pdf" ^
  -F "parse=false"

成功返回示例：
{
  "code": 0,
  "status": "ok",
  "message": "Upload succeeded.",
  "dataset_id": "04f1f520d4c811f0a5cd0242ac1b0006",
  "document_ids": ["e83e5d9e4af911f192a50242ac1b0006"],
  "uploaded": [
    {
      "id": "e83e5d9e4af911f192a50242ac1b0006",
      "name": "demo.pdf",
      "dataset_id": "04f1f520d4c811f0a5cd0242ac1b0006",
      "size": 22937,
      "suffix": "pdf",
      "run": "UNSTART",
      "type": "doc"
    }
  ],
  "parse_started": false,
  "upload_result": {"code": 0, "data": []},
  "parse_result": null,
  "parse_error": null
}

当 parse=true 且上传成功但解析提交失败时，接口可能返回 HTTP 207，响应中的 parse_error 会包含上游错误详情。**


5. RAG 文档查询
5.1 文档列表查询
接口地址：GET /ragflow/documents
参数名	位置	类型	必填	默认值	说明
Authorization	Header	string	是	-	Bearer token。
dataset_alias	Query	string	否	default	数据集别名。default/test/cg。
dataset_id	Query	string	否	空	显式指定数据集 ID。
page	Query	int	否	1	页码，最小 1。
page_size	Query	int	否	30	每页数量，范围 1-200。
orderby	Query	string	否	空	排序字段，透传给 RAGFlow。
desc	Query	bool	否	空	是否倒序。
keywords	Query	string	否	空	关键字过滤。
id	Query	string	否	空	文档 ID 过滤。
name	Query	string	否	空	文档名称过滤。
suffix	Query	string	否	空	文件后缀过滤，例如 pdf、txt。
run	Query	string	否	空	解析状态过滤，例如 RUNNING、DONE、UNSTART。
create_time_from	Query	int	否	空	创建时间起始时间戳，透传给 RAGFlow。
create_time_to	Query	int	否	空	创建时间结束时间戳，透传给 RAGFlow。

curl.exe -G "http://47.114.93.164:8000/ragflow/documents" ^
  -H "Authorization: Bearer <access_token>" ^
  --data-urlencode "dataset_alias=default" ^
  --data-urlencode "page=1" ^
  --data-urlencode "page_size=30" ^
  --data-urlencode "suffix=pdf"

成功返回示例：
{
  "code": 0,
  "status": "ok",
  "dataset_id": "04f1f520d4c811f0a5cd0242ac1b0006",
  "documents": {
    "code": 0,
    "data": {
      "docs": [
        {
          "id": "e83e5d9e4af911f192a50242ac1b0006",
          "name": "demo.pdf",
          "suffix": "pdf",
          "size": 22937,
          "run": "UNSTART",
          "created_by": "4849c82cd3e011f0a5cd0242ac1b0006"
        }
      ],
      "total": 1
    }
  }
}


5.2 文档片段查询
接口地址：GET /ragflow/documents/{document_id}/chunks
参数名	位置	类型	必填	默认值	说明
Authorization	Header	string	是	-	Bearer token。
document_id	Path	string	是	-	文档 ID。
dataset_alias	Query	string	否	default	数据集别名。default/test/cg。
dataset_id	Query	string	否	空	显式指定数据集 ID。
page	Query	int	否	1	页码，最小 1。
page_size	Query	int	否	30	每页数量，范围 1-200。
keywords	Query	string	否	空	切片关键字过滤。
id	Query	string	否	空	切片 ID 过滤。

curl.exe -G "http://47.114.93.164:8000/ragflow/documents/e83e5d9e4af911f192a50242ac1b0006/chunks" ^
  -H "Authorization: Bearer <access_token>" ^
  --data-urlencode "dataset_alias=default" ^
  --data-urlencode "page=1" ^
  --data-urlencode "page_size=30"

成功返回示例：
{
  "code": 0,
  "status": "ok",
  "dataset_id": "04f1f520d4c811f0a5cd0242ac1b0006",
  "document_id": "e83e5d9e4af911f192a50242ac1b0006",
  "chunks": {
    "code": 0,
    "data": {
      "chunks": [
        {
          "id": "chunk_id_001",
          "content": "文档切片内容...",
          "document_id": "e83e5d9e4af911f192a50242ac1b0006"
        }
      ],
      "total": 1
    }
  }
}


6. 错误返回格式
本服务错误通常通过 HTTP 状态码和 JSON detail 返回。RAGFlow 上游错误会包含 upstream 和 context，便于定位上游状态码、目标地址、文件信息和数据集信息。
状态码	含义
200	请求成功。
207	RAG 上传成功，但自动解析提交失败；仅在 parse=true 且解析失败时可能出现。
400	请求参数错误，例如页码范围不合法、缺少文件。
401	未登录、token 无效、token 被新登录顶掉。
403	账号被禁用或无权限。
413	上游提示文件过大。
415	文件类型不支持；数据解析接口要求 PDF。
422	RAGFlow 返回业务错误。
502	上游网关、连接重置或非 JSON 响应。
503	无法连接到上游 RAGFlow。
504	上游请求超时。
错误返回示例：
{
  "detail": {
    "code": 415,
    "status": "unsupported_media_type",
    "message": "pdf_file must be a .pdf file"
  }
}



