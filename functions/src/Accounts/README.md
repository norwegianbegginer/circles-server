# Accounts API


## AccountCreate
`account-accountCreate`

Creates a new account based on email and password credentials.

### Request

name | type | description | required | default
--- | --- | --- | --- | ---
email | `string` | Main E-Mail address used to login. | yes |
password | `string` | Password for the new account. | yes |
label | `string` | Label for the new account. | yes |


### Response

status | data type | message | state
`200` | `{ account_id: string }` | `undefined` | ✔️
`409` | `undefined` | `Account with this email already exists.` | ❌


### Example

#### Request
```
GET /account-accountCreate?email=mike@eling.cloud&password=abc123456&label=EvilGardenDev
```

#### Response
```json
{
    "status": 200,
    "data": { "account_id": "LSOkJVXHCPNtsg2vWI3JL05La1I2" }
}
```

## AccountChange
`account-accountChange`

Changes the properties of an existing account.

### Request

name | type | description | required | default
--- | --- | --- | --- | ---
account_id | `string` | Account unique identifier. | yes |
changes | `Partial<IAccount>` | Changes that will affect the account. | yes |


### Response

status | data type | message | state
--- | --- | --- | ---
`204` | `undefined` | `undefined` | ✔️
`409` | `undefined` | `Account with this id does not exists.` | ❌


### Example

#### Request
```
GET /account-accountChange?account_id=LSOkJVXHCPNtsg2vWI3JL05La1I2&changes={"name": "Mike", "surname": "Eling", "avatar_url": "https://google.com/", "label": "DRFR0ST"}
```

#### Response
```json
{
    "status": 204
}
```

## AccountInfo
`account-accountInfo`

Returns info for the requested account.

### Request

name | type | description | required | default
--- | --- | --- | --- | ---
account_id | `string` | Account unique identifier. | yes |
rooms | `boolean` | Set `true` to get available rooms returned. | no | false
contacts | `boolean` | Set `true` to get available contacts returned. | no | false
flags | `boolean` | Set `true` to get available flags returned. | no | false


### Response

status | data type | message | state
--- | --- | --- | ---
`200` | `IAccount` | `undefined` | ✔️
`409` | `undefined` | `Account with this id does not exists.` | ❌


### Example

#### Request
```
GET /account-accountInfo?account_id=Yyp8XSdOC6epPvcjPMw5LJMtsIT2&contacts=true&flags=true
```

#### Response
```json
{
   "status":200,
   "data":{
      "id":"Yyp8XSdOC6epPvcjPMw5LJMtsIT2",
      "email":"damian.blochowiak@gmail.com",
      "name":"Damian",
      "avatar_url":"https://lh3.googleusercontent.com/a-/AOh14GjcZ5yHKoJdbxnWBEy_HkXB4WNy5DqIUy8FlbEuyA",
      "surname":"Błochowiak",
      "contacts":[
         {
            "account_id":"LSOkJVXHCPNtsg2vWI3JL05La1I2",
            "favorite":true,
            "last_contacted":"Fri Nov 13 2020 20:43:06 GMT 0100 (Central European Standard Time)"
         }
      ],
      "flags":[
         "verify_email"
      ],
      "created_at":"Fri Nov 15 2019 11:42:06 GMT 0100 (Central European Standard Time)",
      "tokens":[
         "cghDemtZn4aGpVAb5CwvBZ:APA91bEVUTFMA94T4ZeXcyTn4BcwrncnF1NrvcEI69Q946QPO9Px0yFKugNJyEYm34uBsHAnlUWNF2FkoZXSb2WeQ4Cf0HrGqtycUHg7UXTLAAYpWx0SbL1_LOU5QqiPuYU-Kt72CHVX"
      ],
      "label":"Damian Błochowiak"
   }
}
```

## AccountLogin
`account-accountLogin`

Authorize account with token.

### Request

name | type | description | required | default
--- | --- | --- | --- | ---
token | `string` | Token required to authenticate. | yes |


### Response

status | data type | message | state
--- | --- | --- | ---
`200` | `{ account_id: string }` | `undefined` | ✔️
`404` | `undefined` | `Token expired.` | ❌


### Example

#### Request
```
GET /account-accountLogin?token=eyJhbGciOiJSUzI1NiIsImtpZCI6IjJmOGI1NTdjMWNkMWUxZWM2ODBjZTkyYWFmY2U0NTIxMWUxZTRiNDEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3...
```

#### Response
```json
{
    "status": 200,
    "data": { "account_id": "Yyp8XSdOC6epPvcjPMw5LJMtsIT2" }
}
```

## AccountGetSuggestions
`account-accountGetSuggestions`

Returns personalized suggestions for account.

### Request

name | type | description | required | default
--- | --- | --- | --- | ---
account_id | `string` | Account unique identifier. | yes |


### Response

status | data type | message | state
--- | --- | --- | ---
`200` | `TSuggestion[]` | `undefined` | ✔️
`404` | `undefined` | `Account not found.` | ❌


### Example

#### Request
```
GET /account-accountGetSuggestions?account_id=Yyp8XSdOC6epPvcjPMw5LJMtsIT2
```

#### Response
```json
{
   "status":200,
   "data":[
      {
         "type":"long-not-messaged",
         "payload":{
            "account_id":"LSOkJVXHCPNtsg2vWI3JL05La1I2"
         }
      },
      {
         "type":"never-messaged",
         "payload":{
            "account_id":"qubEhQf5VISMGJ5bI1e9DxsHqv43"
         }
      },
      {
         "type":"never-messaged",
         "payload":{
            "account_id":"5PwjIQBfkxSUx3SJw6yzTLAOwDE3"
         }
      }
   ]
}
```


More coming soon...