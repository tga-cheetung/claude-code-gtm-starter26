# RevyOps API

## Overview

| Property | Value |
|---|---|
| Base URL | `https://api.revyops.com` (use paths as documented below) |
| Auth Header | `x-api-key: <your-api-key>` |
| Key Generation | Generate your personal API key after logging into RevyOps |
| Master API Key | Required for all `/master-list` endpoints; generate in the API integration panel |

---

# Companies

## v1 — Companies

### GET /public/companies

Search for companies. Returns companies matching the specified criteria.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| domain | string | No | Filter companies by domain |
| industry | string | No | Filter companies by industry |
| name | string | No | Filter companies by name |

**Responses**

| Status | Description |
|---|---|
| 200 | The list of companies was successfully retrieved. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
[
  {
    "id": 0,
    "updated_time": "1900-01-01T12:00:00Z",
    "domain": "string",
    "name": "string",
    "company_status": "string",
    "company_custom_fields": [
      {
        "id": 0,
        "updated_time": "1900-01-01T12:00:00Z",
        "field_name": "string",
        "field_value": "string"
      }
    ],
    "previous_status": "string",
    "status_changed_at": "1900-01-01T12:00:00Z"
  }
]
```

---

### POST /public/companies

Creates a new company in the system with the provided details.

**Request Body**
```json
{
  "domain": "string",
  "name": "string",
  "company_status": "string",
  "company_custom_fields": [
    {
      "field_name": "string",
      "field_value": "string"
    }
  ]
}
```

**Responses**

| Status | Description |
|---|---|
| 201 | Created. The company was successfully created. |
| 400 | Bad Request. Invalid data has been provided. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 409 | Conflict. A company with this domain already exists for this client. |
| 500 | Internal Server Error. |

**Response Body** (201)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "domain": "string",
  "name": "string",
  "company_status": "string",
  "company_custom_fields": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "field_name": "string",
      "field_value": "string"
    }
  ],
  "previous_status": "string",
  "status_changed_at": "1900-01-01T12:00:00Z"
}
```

---

### GET /public/companies/{company_id}

Retrieves details of a specific company by its unique identifier.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| company_id | integer | Yes | Company ID |

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The company was successfully retrieved. |
| 401 | Unauthorized. API KEY not authorized to access this client_id. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Company with this ID does not exist. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "domain": "string",
  "name": "string",
  "company_status": "string",
  "company_custom_fields": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "field_name": "string",
      "field_value": "string"
    }
  ],
  "previous_status": "string",
  "status_changed_at": "1900-01-01T12:00:00Z"
}
```

---

### PATCH /public/companies/{company_id}

Updates the details of an existing company using its unique identifier.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| company_id | integer | Yes | Company ID |

**Request Body**
```json
{
  "name": "string",
  "domain": "string",
  "company_status": "string",
  "company_custom_fields": [
    {
      "field_name": "string",
      "field_value": "string"
    }
  ]
}
```

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The company was successfully updated. |
| 400 | Bad Request. Invalid data has been provided. |
| 401 | Unauthorized. Company does not belong to this client. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Company with this ID does not exist. |
| 409 | Conflict. A company with this domain already exists for this client. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "name": "string",
  "domain": "string",
  "company_status": "string",
  "company_custom_fields": [
    {
      "field_name": "string",
      "field_value": "string"
    }
  ]
}
```

---

### DELETE /public/companies/{company_id}

Deletes a specific company from the system using its unique identifier.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| company_id | integer | Yes | Company ID |

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The company was successfully deleted. |
| 401 | Unauthorized. The company does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. No company with the specified ID exists. |
| 500 | Internal Server Error. |

---

### POST /public/companies/{company_id}/custom-fields

Adds a custom field to a specific company.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| company_id | integer | Yes | Company ID |

**Request Body**
```json
{
  "field_name": "string",
  "field_value": "string"
}
```

**Responses**

| Status | Description |
|---|---|
| 201 | Created. The custom field was successfully created. |
| 400 | Bad Request. Invalid data has been provided. |
| 401 | Unauthorized. Company does not belong to this client. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Company with this ID does not exist. |
| 409 | Conflict. A custom field with this name already exists for this company. |
| 500 | Internal Server Error. |

**Response Body** (201)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "field_name": "string",
  "field_value": "string"
}
```

---

### PATCH /public/companies/{company_id}/custom-fields/{field_id}

Updates the value of an existing custom field for a specific company.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| company_id | integer | Yes | Company ID |
| field_id | integer | Yes | Custom field ID |

**Request Body**
```json
{
  "field_name": "string",
  "field_value": "string"
}
```

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The custom field was successfully updated. |
| 400 | Bad Request. Invalid data has been provided. |
| 401 | Unauthorized. Company does not belong to this client. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Company with this ID does not exist. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "field_name": "string",
  "field_value": "string"
}
```

---

### DELETE /public/companies/{company_id}/custom-fields/{field_id}

Removes a custom field from a specific company.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| company_id | integer | Yes | Company ID |
| field_id | integer | Yes | Custom field ID |

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The custom field was successfully deleted. |
| 401 | Unauthorized. Company does not belong to this client. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Company with this ID does not exist or the field does not belong to this company. |
| 500 | Internal Server Error. |

---

## v1 — Companies Master List

> Requires **Master API Key**.

### GET /public/companies-master-list

Search for companies across all clients. Response limit is 100 companies.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| domain | string | No | Filter companies by domain |
| industry | string | No | Filter companies by industry |
| name | string | No | Filter companies by name |

**Responses**

| Status | Description |
|---|---|
| 200 | The list of companies was successfully retrieved. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
[
  {
    "id": 0,
    "updated_time": "1900-01-01T12:00:00Z",
    "domain": "string",
    "name": "string",
    "company_status": "string",
    "company_custom_fields": [
      {
        "id": 0,
        "updated_time": "1900-01-01T12:00:00Z",
        "field_name": "string",
        "field_value": "string"
      }
    ],
    "client_id": "string",
    "previous_status": "string",
    "status_changed_at": "1900-01-01T12:00:00Z"
  }
]
```

---

### GET /public/companies-master-list/{company_id}

Retrieves details of a specific company by its unique identifier (across all clients).

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| company_id | integer | Yes | Company ID |

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The company was successfully retrieved. |
| 401 | Unauthorized. API KEY not authorized to access this client_id. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Company with this ID does not exist. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "domain": "string",
  "name": "string",
  "company_status": "string",
  "company_custom_fields": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "field_name": "string",
      "field_value": "string"
    }
  ],
  "client_id": "string",
  "previous_status": "string",
  "status_changed_at": "1900-01-01T12:00:00Z"
}
```

---

## v2 — Companies

### GET /public/v2/companies

Search for companies with pagination and custom field format control.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| domain | string | No | Filter companies by domain |
| industry | string | No | Filter companies by industry |
| name | string | No | Filter companies by name |
| page | integer | No | Page number (1-based) |
| page_size | integer | No | Number of companies per page (max 100) |
| structure | string | No | Custom fields format: `NESTED` (array of objects) or `FLAT` (object with field names as keys) |

**Responses**

| Status | Description |
|---|---|
| 200 | Paginated list of companies. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "count": 0,
  "total_pages": 0,
  "current_page": 0,
  "page_size": 0,
  "results": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "domain": "string",
      "name": "string",
      "company_status": "string",
      "company_custom_fields": [
        {
          "id": 0,
          "updated_time": "1900-01-01T12:00:00Z",
          "field_name": "string",
          "field_value": "string"
        }
      ],
      "previous_status": "string",
      "status_changed_at": "1900-01-01T12:00:00Z"
    }
  ]
}
```

---

### POST /public/v2/companies

Creates a new company in the system with the provided details.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| structure | string | No | Custom fields format: `NESTED` or `FLAT` |

**Request Body**
```json
{
  "domain": "string",
  "name": "string",
  "company_status": "string",
  "company_custom_fields": [
    {
      "field_name": "string",
      "field_value": "string"
    }
  ]
}
```

**Responses**

| Status | Description |
|---|---|
| 201 | Created. The company was successfully created. |
| 400 | Bad Request. Invalid data has been provided. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 409 | Conflict. A company with this domain already exists for this client. |
| 500 | Internal Server Error. |

**Response Body** (201)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "domain": "string",
  "name": "string",
  "company_status": "string",
  "company_custom_fields": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "field_name": "string",
      "field_value": "string"
    }
  ],
  "previous_status": "string",
  "status_changed_at": "1900-01-01T12:00:00Z"
}
```

---

### GET /public/v2/companies/{company_id}

Retrieves details of a specific company by its unique identifier.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| company_id | integer | Yes | Company ID |
| structure | string | No | Custom fields format: `NESTED` or `FLAT` |

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The company was successfully retrieved. |
| 401 | Unauthorized. API KEY not authorized to access this client_id. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Company with this ID does not exist. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "domain": "string",
  "name": "string",
  "company_status": "string",
  "company_custom_fields": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "field_name": "string",
      "field_value": "string"
    }
  ],
  "previous_status": "string",
  "status_changed_at": "1900-01-01T12:00:00Z"
}
```

---

### PATCH /public/v2/companies/{company_id}

Updates the details of an existing company using its unique identifier.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| company_id | integer | Yes | Company ID |
| structure | string | No | Custom fields format: `NESTED` or `FLAT` |

**Request Body**
```json
{
  "name": "string",
  "domain": "string",
  "company_status": "string",
  "company_custom_fields": [
    {
      "field_name": "string",
      "field_value": "string"
    }
  ]
}
```

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The company was successfully updated. |
| 400 | Bad Request. Invalid data has been provided. |
| 401 | Unauthorized. Company does not belong to this client. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Company with this ID does not exist. |
| 409 | Conflict. A company with this domain already exists for this client. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "name": "string",
  "domain": "string",
  "company_status": "string",
  "company_custom_fields": [
    {
      "field_name": "string",
      "field_value": "string"
    }
  ]
}
```

---

### GET /public/v2/companies/lookup-by-custom-field

Searches for companies that contain a specific value in a specific custom field. Returns up to 100 matching companies.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| field_name | string | Yes | Name of the custom field to search for |
| field_value | string | Yes | Value of the custom field to search for |
| page | integer | No | Page number (1-based) |
| page_size | integer | No | Number of companies per page (max 100) |

**Responses**

| Status | Description |
|---|---|
| 200 | Paginated list of companies. |
| 400 | Bad Request. Missing required parameters. |
| 401 | Unauthorized. The company does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "count": 0,
  "total_pages": 0,
  "current_page": 0,
  "page_size": 0,
  "results": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "domain": "string",
      "name": "string",
      "company_status": "string",
      "company_custom_fields": [
        {
          "id": 0,
          "updated_time": "1900-01-01T12:00:00Z",
          "field_name": "string",
          "field_value": "string"
        }
      ],
      "previous_status": "string",
      "status_changed_at": "1900-01-01T12:00:00Z"
    }
  ]
}
```

---

## v2 — Companies Master List

> Requires **Master API Key**.

### GET /public/v2/companies-master-list

Search for companies across all clients with pagination and custom field format control.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| domain | string | No | Filter companies by domain |
| industry | string | No | Filter companies by industry |
| name | string | No | Filter companies by name |
| page | integer | No | Page number (1-based) |
| page_size | integer | No | Number of companies per page (max 100) |
| structure | string | No | Custom fields format: `NESTED` or `FLAT` |

**Responses**

| Status | Description |
|---|---|
| 200 | Paginated list of companies. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "count": 0,
  "total_pages": 0,
  "current_page": 0,
  "page_size": 0,
  "results": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "domain": "string",
      "name": "string",
      "company_status": "string",
      "company_custom_fields": [
        {
          "id": 0,
          "updated_time": "1900-01-01T12:00:00Z",
          "field_name": "string",
          "field_value": "string"
        }
      ],
      "previous_status": "string",
      "status_changed_at": "1900-01-01T12:00:00Z"
    }
  ]
}
```

---

### GET /public/v2/companies-master-list/{company_id}

Retrieves details of a specific company by its unique identifier (across all clients).

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| company_id | integer | Yes | Company ID |
| structure | string | No | Custom fields format: `NESTED` or `FLAT` |

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The company was successfully retrieved. |
| 401 | Unauthorized. API KEY not authorized to access this client_id. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Company with this ID does not exist. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "domain": "string",
  "name": "string",
  "company_status": "string",
  "company_custom_fields": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "field_name": "string",
      "field_value": "string"
    }
  ],
  "client_id": "string",
  "previous_status": "string",
  "status_changed_at": "1900-01-01T12:00:00Z"
}
```

---

### GET /public/v2/companies-master-list/lookup-by-custom-field

Searches for companies that contain a specific value in a specific custom field across all clients. Returns up to 100 matching companies.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| field_name | string | Yes | Name of the custom field to search for |
| field_value | string | Yes | Value of the custom field to search for |
| page | integer | No | Page number (1-based) |
| page_size | integer | No | Number of companies per page (max 100) |

**Responses**

| Status | Description |
|---|---|
| 200 | Paginated list of companies. |
| 400 | Bad Request. Missing required parameters. |
| 401 | Unauthorized. The company does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "count": 0,
  "total_pages": 0,
  "current_page": 0,
  "page_size": 0,
  "results": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "domain": "string",
      "name": "string",
      "company_status": "string",
      "company_custom_fields": [
        {
          "id": 0,
          "updated_time": "1900-01-01T12:00:00Z",
          "field_name": "string",
          "field_value": "string"
        }
      ],
      "previous_status": "string",
      "status_changed_at": "1900-01-01T12:00:00Z"
    }
  ]
}
```

---

# Contacts

## v1 — Contacts

### GET /public/contacts

Search for contacts. Response limit is 100 contacts.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| domain | string | No | Filter for contacts with companies matching a domain (excludes contacts without companies) |
| email | string | No | Filter by email |
| firstname | string | No | Filter by first name |
| lastname | string | No | Filter by last name |
| linkedin_url | string | No | Filter by LinkedIn URL |

**Responses**

| Status | Description |
|---|---|
| 200 | List of contacts successfully retrieved. |
| 401 | Unauthorized. The contact does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | No contact with the specified ID exists. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
[
  {
    "id": 0,
    "updated_time": "1900-01-01T12:00:00Z",
    "email": "string",
    "linkedin_url": "string",
    "first_name": "string",
    "last_name": "string",
    "company_id": 0,
    "contact_custom_fields": [
      {
        "id": 0,
        "updated_time": "1900-01-01T12:00:00Z",
        "field_name": "string",
        "field_value": "string"
      }
    ],
    "origin": "string",
    "first_campaign_email_sent": "1900-01-01T12:00:00Z",
    "last_campaign_email_sent": "1900-01-01T12:00:00Z",
    "last_reply_received": "1900-01-01T12:00:00Z",
    "contact_status": "string",
    "previous_status": "string",
    "status_changed_at": "1900-01-01T12:00:00Z"
  }
]
```

---

### POST /public/contacts

Creates a new contact. `company_id` accepts an integer ID or a domain string to auto-resolve the company.

**Request Body**
```json
{
  "email": "string",
  "linkedin_url": "string",
  "first_name": "string",
  "last_name": "string",
  "company_id": 0,
  "contact_custom_fields": [
    {
      "field_name": "string",
      "field_value": "string"
    }
  ],
  "origin": "string",
  "contact_status": "string"
}
```

**Responses**

| Status | Description |
|---|---|
| 201 | Created. The contact was successfully created. |
| 400 | Bad Request. Invalid or missing fields. |
| 401 | Unauthorized. Company does not belong to this client. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Company with this ID does not exist. |
| 409 | Conflict. Contact with this email or LinkedIn URL already exists for this client. |
| 500 | Internal Server Error. |

**Response Body** (201)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "email": "string",
  "linkedin_url": "string",
  "first_name": "string",
  "last_name": "string",
  "company_id": 0,
  "contact_custom_fields": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "field_name": "string",
      "field_value": "string"
    }
  ],
  "origin": "string",
  "contact_status": "string",
  "first_campaign_email_sent": "1900-01-01T12:00:00Z",
  "last_campaign_email_sent": "1900-01-01T12:00:00Z",
  "last_reply_received": "1900-01-01T12:00:00Z",
  "previous_status": "string",
  "status_changed_at": "1900-01-01T12:00:00Z"
}
```

---

### GET /public/contacts/{contact_id}

Retrieves details of a specific contact by its unique identifier.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| contact_id | integer | Yes | Contact ID |

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The contact was successfully retrieved. |
| 401 | Unauthorized. The contact does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | No contact with the specified ID exists. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "email": "string",
  "linkedin_url": "string",
  "first_name": "string",
  "last_name": "string",
  "company_id": 0,
  "contact_custom_fields": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "field_name": "string",
      "field_value": "string"
    }
  ],
  "origin": "string",
  "first_campaign_email_sent": "1900-01-01T12:00:00Z",
  "last_campaign_email_sent": "1900-01-01T12:00:00Z",
  "last_reply_received": "1900-01-01T12:00:00Z",
  "contact_status": "string",
  "previous_status": "string",
  "status_changed_at": "1900-01-01T12:00:00Z"
}
```

---

### PATCH /public/contacts/{contact_id}

Updates the details of an existing contact. `company_id` accepts an integer ID or a domain string to auto-resolve the company.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| contact_id | integer | Yes | Contact ID |

**Request Body**
```json
{
  "email": "string",
  "linkedin_url": "string",
  "first_name": "string",
  "last_name": "string",
  "company_id": 0,
  "origin": "string",
  "contact_status": "string",
  "contact_custom_fields": [
    {
      "field_name": "string",
      "field_value": "string"
    }
  ]
}
```

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The contact was successfully updated. |
| 400 | Bad Request. Invalid data has been provided. |
| 401 | Unauthorized. Company does not belong to this client. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Contact with this ID does not exist. |
| 409 | Conflict. A contact with this email or LinkedIn URL already exists for this client. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "email": "string",
  "linkedin_url": "string",
  "first_name": "string",
  "last_name": "string",
  "company_id": 0,
  "contact_custom_fields": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "field_name": "string",
      "field_value": "string"
    }
  ],
  "origin": "string",
  "contact_status": "string",
  "first_campaign_email_sent": "1900-01-01T12:00:00Z",
  "last_campaign_email_sent": "1900-01-01T12:00:00Z",
  "last_reply_received": "1900-01-01T12:00:00Z",
  "previous_status": "string",
  "status_changed_at": "1900-01-01T12:00:00Z"
}
```

---

### DELETE /public/contacts/{contact_id}

Deletes a specific contact from the system using its unique identifier.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| contact_id | integer | Yes | Contact ID |

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The contact was successfully deleted. |
| 401 | Unauthorized. The contact does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | No contact with the specified ID exists. |
| 500 | Internal Server Error. |

---

### POST /public/contacts/{contact_id}/custom-fields

Adds a custom field to a specific contact.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| contact_id | integer | Yes | Contact ID |

**Request Body**
```json
{
  "field_name": "string",
  "field_value": "string"
}
```

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The custom field was successfully created. |
| 400 | Bad Request. Invalid data has been provided. |
| 401 | Unauthorized. Contact does not belong to this client. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Contact with this ID does not exist. |
| 409 | Conflict. A contact with this email already exists for this client. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "field_name": "string",
  "field_value": "string"
}
```

---

### PATCH /public/contacts/{contact_id}/custom-fields/{field_id}

Updates the value of an existing custom field for a specific contact.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| contact_id | integer | Yes | Contact ID |
| field_id | integer | Yes | Custom field ID |

**Request Body**
```json
{
  "field_name": "string",
  "field_value": "string"
}
```

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The custom field was successfully updated. |
| 400 | Bad Request. Invalid data has been provided. |
| 401 | Unauthorized. Contact does not belong to this client. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Contact with this ID does not exist. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "field_name": "string",
  "field_value": "string"
}
```

---

### DELETE /public/contacts/{contact_id}/custom-fields/{field_id}

Deletes a custom field for a contact using the contact ID and field ID.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| contact_id | integer | Yes | Contact ID |
| field_id | integer | Yes | Custom field ID |

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The custom field was successfully deleted. |
| 401 | Unauthorized. Contact does not belong to this client. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Custom field with this ID does not exist. |
| 500 | Internal Server Error. |

---

### GET /public/contacts/lookup-by-custom-field

Searches for contacts that contain a specific value in a specific custom field. Returns up to 100 matching contacts.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| field_name | string | Yes | Name of the custom field to search for |
| field_value | string | Yes | Value of the custom field to search for |

**Responses**

| Status | Description |
|---|---|
| 200 | List of matching contacts. |
| 400 | Bad Request. Missing required parameters. |
| 401 | Unauthorized. The contact does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
[
  {
    "id": 0,
    "updated_time": "1900-01-01T12:00:00Z",
    "email": "string",
    "linkedin_url": "string",
    "first_name": "string",
    "last_name": "string",
    "company_id": 0,
    "contact_custom_fields": [
      {
        "id": 0,
        "updated_time": "1900-01-01T12:00:00Z",
        "field_name": "string",
        "field_value": "string"
      }
    ],
    "origin": "string",
    "first_campaign_email_sent": "1900-01-01T12:00:00Z",
    "last_campaign_email_sent": "1900-01-01T12:00:00Z",
    "last_reply_received": "1900-01-01T12:00:00Z",
    "contact_status": "string",
    "previous_status": "string",
    "status_changed_at": "1900-01-01T12:00:00Z"
  }
]
```

---

## v1 — Contacts Master List

> Requires **Master API Key**.

### GET /public/contacts-master-list

Search for contacts across all clients. Response limit is 100 contacts.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| domain | string | No | Filter for contacts with companies matching a domain (excludes contacts without companies) |
| email | string | No | Filter by email |
| firstname | string | No | Filter by first name |
| lastname | string | No | Filter by last name |
| linkedin_url | string | No | Filter by LinkedIn URL |

**Responses**

| Status | Description |
|---|---|
| 200 | List of contacts successfully retrieved. |
| 401 | Unauthorized. The contact does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | No contact with the specified ID exists. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
[
  {
    "id": 0,
    "updated_time": "1900-01-01T12:00:00Z",
    "email": "string",
    "linkedin_url": "string",
    "first_name": "string",
    "last_name": "string",
    "company_id": 0,
    "contact_custom_fields": [
      {
        "id": 0,
        "updated_time": "1900-01-01T12:00:00Z",
        "field_name": "string",
        "field_value": "string"
      }
    ],
    "origin": "string",
    "first_campaign_email_sent": "1900-01-01T12:00:00Z",
    "last_campaign_email_sent": "1900-01-01T12:00:00Z",
    "last_reply_received": "1900-01-01T12:00:00Z",
    "contact_status": "string",
    "client_id": "string",
    "previous_status": "string",
    "status_changed_at": "1900-01-01T12:00:00Z"
  }
]
```

---

### GET /public/contacts-master-list/{contact_id}

Retrieves details of a specific contact by its unique identifier (across all clients).

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| contact_id | integer | Yes | Contact ID |

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The contact was successfully retrieved. |
| 401 | Unauthorized. The contact does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | No contact with the specified ID exists. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "email": "string",
  "linkedin_url": "string",
  "first_name": "string",
  "last_name": "string",
  "company_id": 0,
  "contact_custom_fields": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "field_name": "string",
      "field_value": "string"
    }
  ],
  "origin": "string",
  "first_campaign_email_sent": "1900-01-01T12:00:00Z",
  "last_campaign_email_sent": "1900-01-01T12:00:00Z",
  "last_reply_received": "1900-01-01T12:00:00Z",
  "contact_status": "string",
  "client_id": "string",
  "previous_status": "string",
  "status_changed_at": "1900-01-01T12:00:00Z"
}
```

---

### GET /public/contacts-master-list/lookup-by-custom-field

Searches for contacts that contain a specific value in a specific custom field across all clients. Returns up to 100 matching contacts.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| field_name | string | Yes | Name of the custom field to search for |
| field_value | string | Yes | Value of the custom field to search for |

**Responses**

| Status | Description |
|---|---|
| 200 | List of matching contacts. |
| 400 | Bad Request. Missing required parameters. |
| 401 | Unauthorized. The contact does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
[
  {
    "id": 0,
    "updated_time": "1900-01-01T12:00:00Z",
    "email": "string",
    "linkedin_url": "string",
    "first_name": "string",
    "last_name": "string",
    "company_id": 0,
    "contact_custom_fields": [
      {
        "id": 0,
        "updated_time": "1900-01-01T12:00:00Z",
        "field_name": "string",
        "field_value": "string"
      }
    ],
    "origin": "string",
    "first_campaign_email_sent": "1900-01-01T12:00:00Z",
    "last_campaign_email_sent": "1900-01-01T12:00:00Z",
    "last_reply_received": "1900-01-01T12:00:00Z",
    "contact_status": "string",
    "client_id": "string",
    "previous_status": "string",
    "status_changed_at": "1900-01-01T12:00:00Z"
  }
]
```

---

## v2 — Contacts

### GET /public/v2/contacts

Search for contacts with pagination and custom field format control. Response limit is 100 contacts.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| domain | string | No | Filter for contacts with companies matching a domain (excludes contacts without companies) |
| email | string | No | Filter by email |
| firstname | string | No | Filter by first name |
| lastname | string | No | Filter by last name |
| page | integer | No | Page number (1-based) |
| page_size | integer | No | Number of contacts per page (max 100) |
| structure | string | No | Custom fields format: `NESTED` or `FLAT` |

**Responses**

| Status | Description |
|---|---|
| 200 | Paginated list of contacts. |
| 401 | Unauthorized. The contact does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | No contact with the specified ID exists. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "count": 0,
  "total_pages": 0,
  "current_page": 0,
  "page_size": 0,
  "results": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "email": "string",
      "linkedin_url": "string",
      "first_name": "string",
      "last_name": "string",
      "company_id": 0,
      "contact_custom_fields": "string",
      "contact_custom_fields_input": [
        {
          "id": 0,
          "updated_time": "1900-01-01T12:00:00Z",
          "field_name": "string",
          "field_value": "string"
        }
      ],
      "origin": "string",
      "first_campaign_email_sent": "1900-01-01T12:00:00Z",
      "last_campaign_email_sent": "1900-01-01T12:00:00Z",
      "last_reply_received": "1900-01-01T12:00:00Z",
      "contact_status": "string",
      "previous_status": "string",
      "status_changed_at": "1900-01-01T12:00:00Z"
    }
  ]
}
```

---

### POST /public/v2/contacts

Creates a new contact. `company_id` accepts an integer ID or a domain string to auto-resolve the company.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| structure | string | No | Custom fields format: `NESTED` or `FLAT` |

**Request Body**
```json
{
  "email": "string",
  "linkedin_url": "string",
  "first_name": "string",
  "last_name": "string",
  "company_id": 0,
  "contact_custom_fields_input": [
    {
      "field_name": "string",
      "field_value": "string"
    }
  ],
  "origin": "string",
  "contact_status": "string"
}
```

**Responses**

| Status | Description |
|---|---|
| 201 | Created. The contact was successfully created. |
| 400 | Bad Request. Invalid or missing fields. |
| 401 | Unauthorized. Company does not belong to this client. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Company with this ID does not exist. |
| 409 | Conflict. Contact with this email or LinkedIn URL already exists for this client. |
| 500 | Internal Server Error. |

**Response Body** (201)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "email": "string",
  "linkedin_url": "string",
  "first_name": "string",
  "last_name": "string",
  "company_id": 0,
  "contact_custom_fields": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "field_name": "string",
      "field_value": "string"
    }
  ],
  "origin": "string",
  "contact_status": "string",
  "first_campaign_email_sent": "1900-01-01T12:00:00Z",
  "last_campaign_email_sent": "1900-01-01T12:00:00Z",
  "last_reply_received": "1900-01-01T12:00:00Z",
  "previous_status": "string",
  "status_changed_at": "1900-01-01T12:00:00Z"
}
```

---

### GET /public/v2/contacts/{contact_id}

Retrieves details of a specific contact by its unique identifier.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| contact_id | integer | Yes | Contact ID |
| structure | string | No | Custom fields format: `NESTED` or `FLAT` |

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The contact was successfully retrieved. |
| 401 | Unauthorized. The contact does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | No contact with the specified ID exists. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "email": "string",
  "linkedin_url": "string",
  "first_name": "string",
  "last_name": "string",
  "company_id": 0,
  "contact_custom_fields": "string",
  "contact_custom_fields_input": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "field_name": "string",
      "field_value": "string"
    }
  ],
  "origin": "string",
  "first_campaign_email_sent": "1900-01-01T12:00:00Z",
  "last_campaign_email_sent": "1900-01-01T12:00:00Z",
  "last_reply_received": "1900-01-01T12:00:00Z",
  "contact_status": "string",
  "previous_status": "string",
  "status_changed_at": "1900-01-01T12:00:00Z"
}
```

---

### PATCH /public/v2/contacts/{contact_id}

Updates the details of an existing contact. `company_id` accepts an integer ID or a domain string to auto-resolve the company.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| contact_id | integer | Yes | Contact ID |
| structure | string | No | Custom fields format: `NESTED` or `FLAT` |

**Request Body**
```json
{
  "email": "string",
  "linkedin_url": "string",
  "first_name": "string",
  "last_name": "string",
  "company_id": 0,
  "origin": "string",
  "contact_status": "string",
  "contact_custom_fields": [
    {
      "field_name": "string",
      "field_value": "string"
    }
  ]
}
```

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The contact was successfully updated. |
| 400 | Bad Request. Invalid data has been provided. |
| 401 | Unauthorized. Company does not belong to this client. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Contact with this ID does not exist. |
| 409 | Conflict. A contact with this email or LinkedIn URL already exists for this client. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "email": "string",
  "linkedin_url": "string",
  "first_name": "string",
  "last_name": "string",
  "company_id": 0,
  "contact_custom_fields": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "field_name": "string",
      "field_value": "string"
    }
  ],
  "origin": "string",
  "contact_status": "string",
  "first_campaign_email_sent": "1900-01-01T12:00:00Z",
  "last_campaign_email_sent": "1900-01-01T12:00:00Z",
  "last_reply_received": "1900-01-01T12:00:00Z",
  "previous_status": "string",
  "status_changed_at": "1900-01-01T12:00:00Z"
}
```

---

### GET /public/v2/contacts/lookup-by-custom-field

Searches for contacts that contain a specific value in a specific custom field. Returns up to 100 matching contacts.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| field_name | string | Yes | Name of the custom field to search for |
| field_value | string | Yes | Value of the custom field to search for |
| page | integer | No | Page number (1-based) |
| page_size | integer | No | Number of contacts per page (max 100) |
| structure | string | No | Custom fields format: `NESTED` or `FLAT` |

**Responses**

| Status | Description |
|---|---|
| 200 | Paginated list of contacts. |
| 400 | Bad Request. Missing required parameters. |
| 401 | Unauthorized. The contact does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "count": 0,
  "total_pages": 0,
  "current_page": 0,
  "page_size": 0,
  "results": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "email": "string",
      "linkedin_url": "string",
      "first_name": "string",
      "last_name": "string",
      "company_id": 0,
      "contact_custom_fields": "string",
      "contact_custom_fields_input": [
        {
          "id": 0,
          "updated_time": "1900-01-01T12:00:00Z",
          "field_name": "string",
          "field_value": "string"
        }
      ],
      "origin": "string",
      "first_campaign_email_sent": "1900-01-01T12:00:00Z",
      "last_campaign_email_sent": "1900-01-01T12:00:00Z",
      "last_reply_received": "1900-01-01T12:00:00Z",
      "contact_status": "string",
      "previous_status": "string",
      "status_changed_at": "1900-01-01T12:00:00Z"
    }
  ]
}
```

---

## v2 — Contacts Master List

> Requires **Master API Key**.

### GET /public/v2/contacts-master-list

Search for contacts across all clients with pagination and custom field format control. Response limit is 100 contacts.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| domain | string | No | Filter for contacts with companies matching a domain (excludes contacts without companies) |
| email | string | No | Filter by email |
| firstname | string | No | Filter by first name |
| lastname | string | No | Filter by last name |
| linkedin_url | string | No | Filter by LinkedIn URL |
| page | integer | No | Page number (1-based) |
| page_size | integer | No | Number of contacts per page (max 100) |
| structure | string | No | Custom fields format: `NESTED` or `FLAT` |

**Responses**

| Status | Description |
|---|---|
| 200 | Paginated list of contacts. |
| 401 | Unauthorized. The contact does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | No contact with the specified ID exists. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "count": 0,
  "total_pages": 0,
  "current_page": 0,
  "page_size": 0,
  "results": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "email": "string",
      "linkedin_url": "string",
      "first_name": "string",
      "last_name": "string",
      "company_id": 0,
      "contact_custom_fields": [
        {
          "id": 0,
          "updated_time": "1900-01-01T12:00:00Z",
          "field_name": "string",
          "field_value": "string"
        }
      ],
      "origin": "string",
      "first_campaign_email_sent": "1900-01-01T12:00:00Z",
      "last_campaign_email_sent": "1900-01-01T12:00:00Z",
      "last_reply_received": "1900-01-01T12:00:00Z",
      "contact_status": "string",
      "client_id": "string",
      "previous_status": "string",
      "status_changed_at": "1900-01-01T12:00:00Z"
    }
  ]
}
```

---

### GET /public/v2/contacts-master-list/{contact_id}

Retrieves details of a specific contact by its unique identifier (across all clients).

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| contact_id | integer | Yes | Contact ID |
| structure | string | No | Custom fields format: `NESTED` or `FLAT` |

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The contact was successfully retrieved. |
| 401 | Unauthorized. The contact does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | No contact with the specified ID exists. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "email": "string",
  "linkedin_url": "string",
  "first_name": "string",
  "last_name": "string",
  "company_id": 0,
  "contact_custom_fields": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "field_name": "string",
      "field_value": "string"
    }
  ],
  "origin": "string",
  "first_campaign_email_sent": "1900-01-01T12:00:00Z",
  "last_campaign_email_sent": "1900-01-01T12:00:00Z",
  "last_reply_received": "1900-01-01T12:00:00Z",
  "contact_status": "string",
  "client_id": "string",
  "previous_status": "string",
  "status_changed_at": "1900-01-01T12:00:00Z"
}
```

---

### GET /public/v2/contacts-master-list/lookup-by-custom-field

Searches for contacts that contain a specific value in a specific custom field across all clients. Returns up to 100 matching contacts.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| field_name | string | Yes | Name of the custom field to search for |
| field_value | string | Yes | Value of the custom field to search for |
| page | integer | No | Page number (1-based) |
| page_size | integer | No | Number of contacts per page (max 100) |
| structure | string | No | Custom fields format: `NESTED` or `FLAT` |

**Responses**

| Status | Description |
|---|---|
| 200 | Paginated list of contacts. |
| 400 | Bad Request. Missing required parameters. |
| 401 | Unauthorized. The contact does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "count": 0,
  "total_pages": 0,
  "current_page": 0,
  "page_size": 0,
  "results": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "email": "string",
      "linkedin_url": "string",
      "first_name": "string",
      "last_name": "string",
      "company_id": 0,
      "contact_custom_fields": [
        {
          "id": 0,
          "updated_time": "1900-01-01T12:00:00Z",
          "field_name": "string",
          "field_value": "string"
        }
      ],
      "origin": "string",
      "first_campaign_email_sent": "1900-01-01T12:00:00Z",
      "last_campaign_email_sent": "1900-01-01T12:00:00Z",
      "last_reply_received": "1900-01-01T12:00:00Z",
      "contact_status": "string",
      "client_id": "string",
      "previous_status": "string",
      "status_changed_at": "1900-01-01T12:00:00Z"
    }
  ]
}
```

---

# Emails

## v1 — Emails

### GET /public/emails

Search for emails. Returns emails matching the specified criteria.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| campaign_id | string | No | Filter emails by campaign ID |
| contact_email | string | No | Filter emails by contact email |
| origin | string | No | Filter emails by origin |
| subject | string | No | Filter emails by subject |

**Responses**

| Status | Description |
|---|---|
| 200 | The list of emails was successfully retrieved. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
[
  {
    "id": 0,
    "updated_time": "1900-01-01T12:00:00Z",
    "email_timestamp": "1900-01-01T12:00:00Z",
    "contact_email": "user@example.com",
    "contact_id": 0,
    "agent_email": "user@example.com",
    "email_type": "string",
    "subject": "string",
    "body_text": "string",
    "body_html": "string",
    "campaign_id": "string",
    "campaign_name": "string",
    "interested": true,
    "origin": "string",
    "custom_fields": [
      {
        "id": 0,
        "updated_time": "1900-01-01T12:00:00Z",
        "field_name": "string",
        "field_value": "string"
      }
    ]
  }
]
```

---

### POST /public/emails

Creates a new email in the system with the provided details.

**Request Body**
```json
{
  "email_timestamp": "1900-01-01T12:00:00Z",
  "contact_email": "user@example.com",
  "contact_id": 0,
  "agent_email": "user@example.com",
  "email_type": "string",
  "subject": "string",
  "body_text": "string",
  "body_html": "string",
  "campaign_id": "string",
  "campaign_name": "string",
  "interested": true,
  "origin": "string",
  "custom_fields": [
    {
      "field_name": "string",
      "field_value": "string"
    }
  ]
}
```

**Responses**

| Status | Description |
|---|---|
| 201 | Created. The email was successfully created. |
| 400 | Bad Request. Invalid data has been provided. |
| 401 | Unauthorized. Contact does not belong to this client. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Contact with this ID does not exist. |
| 500 | Internal Server Error. |

**Response Body** (201)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "email_timestamp": "1900-01-01T12:00:00Z",
  "contact_email": "user@example.com",
  "contact_id": 0,
  "agent_email": "user@example.com",
  "email_type": "string",
  "subject": "string",
  "body_text": "string",
  "body_html": "string",
  "campaign_id": "string",
  "campaign_name": "string",
  "interested": true,
  "origin": "string",
  "custom_fields": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "field_name": "string",
      "field_value": "string"
    }
  ]
}
```

---

### GET /public/emails/{email_id}

Retrieves details of a specific email by its unique identifier.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| email_id | integer | Yes | Email ID |

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The email was successfully retrieved. |
| 401 | Unauthorized. API KEY not authorized to access this client_id. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Email with this ID does not exist. |
| 500 | Internal Server Error. |

**Response Body** (200)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "email_timestamp": "1900-01-01T12:00:00Z",
  "contact_email": "user@example.com",
  "contact_id": 0,
  "agent_email": "user@example.com",
  "email_type": "string",
  "subject": "string",
  "body_text": "string",
  "body_html": "string",
  "campaign_id": "string",
  "campaign_name": "string",
  "interested": true,
  "origin": "string",
  "custom_fields": [
    {
      "id": 0,
      "updated_time": "1900-01-01T12:00:00Z",
      "field_name": "string",
      "field_value": "string"
    }
  ]
}
```

---

### DELETE /public/emails/{email_id}

Deletes a specific email from the system using its unique identifier.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| email_id | integer | Yes | Email ID |

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The email was successfully deleted. |
| 401 | Unauthorized. The email does not belong to the authenticated client's API key. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. No email with the specified ID exists. |
| 500 | Internal Server Error. |

---

### POST /public/emails/{email_id}/custom-fields

Adds a custom field to a specific email.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| email_id | integer | Yes | Email ID |

**Request Body**
```json
{
  "field_name": "string",
  "field_value": "string"
}
```

**Responses**

| Status | Description |
|---|---|
| 201 | Created. The custom field was successfully created. |
| 400 | Bad Request. Invalid data has been provided. |
| 401 | Unauthorized. Email does not belong to this client. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Email with this ID does not exist. |
| 500 | Internal Server Error. |

**Response Body** (201)
```json
{
  "id": 0,
  "updated_time": "1900-01-01T12:00:00Z",
  "field_name": "string",
  "field_value": "string"
}
```

---

### DELETE /public/emails/{email_id}/custom-fields/{field_id}

Removes a custom field from a specific email.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| email_id | integer | Yes | Email ID |
| field_id | integer | Yes | Custom field ID |

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The custom field was successfully deleted. |
| 401 | Unauthorized. Email does not belong to this client. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 404 | Not Found. Email with this ID does not exist or the field does not belong to this email. |
| 500 | Internal Server Error. |

---

### POST /public/emails/set-interested

Sets the `interested` field of an email to `true`.

**Request Body**
```json
{
  "email": "string",
  "subject": "string",
  "disposition": "string"
}
```

**Responses**

| Status | Description |
|---|---|
| 200 | OK. The "interested" field is now TRUE. |
| 400 | Bad Request. Invalid data has been provided. |
| 403 | Forbidden. Missing authentication credentials or invalid API key. |
| 500 | Internal Server Error. |
