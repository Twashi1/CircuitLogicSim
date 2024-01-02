# API reference index

## Circuits

- [GET /getCircuit](#get-getcircuit)
- [GET /getCircuits](#get-getcircuits)
- [POST /saveCircuit](#post-savecircuit)

## Users

- [GET /getUsers](#get-getusers)
- [GET /getUser](#get-getuser)
- [POST /login](#post-login)
- [POST /createAccount](#post-createaccount)

# API

## Circuits

### GET /getCircuit

Get the circuit data for a specific circuit under a given username

#### Resource Information

<table>
    <tr>
        <th>Response formats</th>
        <th>Requires authentication?</th>
        <th>Rate limited?</th>
    </tr>
    <tr>
        <td>JSON</td>
        <td>No</td>
        <td>No</td>
    </tr>
</table>

#### Parameters

<table>
    <tr>
        <th>Name</th>
        <th>Required</th>
        <th>Description</th>
        <th>Default value</th>
        <th>Example</th>
    </tr>
    <tr>
        <td>username</td>
        <td>required</td>
        <td>The username identifies which JSON file to get user circuit data from, alphanumeric</td>
        <td></td>
        <td>thomas</td>
    </tr>
    <tr>
        <td>circuitName</td>
        <td>required</td>
        <td>The name of the circuit to look for under that user, alphanumeric</td>
        <td></td>
        <td>NAND</td>
    </tr>
</table>

#### Example request

Send the user to `/getCircuit` in a web browser, including the username of who you want to get the circuit from, and the name of the circuit you want to get:
`127.0.0.1:8090/getCircuits?username=thomas&circuitName=NAND`

#### Example response

`{"name": NAND, "data": <circuit_example_data.json>}`

### GET /getCircuits

Returns list of names of all circuits saved to the given username

#### Resource Information

<table>
    <tr>
        <th>Response formats</th>
        <th>Requires authentication?</th>
        <th>Rate limited?</th>
    </tr>
    <tr>
        <td>JSON</td>
        <td>No</td>
        <td>No</td>
    </tr>
</table>

#### Parameters

<table>
    <tr>
        <th>Name</th>
        <th>Required</th>
        <th>Description</th>
        <th>Default value</th>
        <th>Example</th>
    </tr>
    <tr>
        <td>username</td>
        <td>required</td>
        <td>The username identifies which JSON file to get user circuit data from, alphanumeric</td>
        <td></td>
        <td>thomas</td>
    </tr>
</table>

#### Example request

Send the user to `/getCircuits` in a web browser, including the username of whose circuits you want to get the names of:
`127.0.0.1:8090/getCircuits?username=thomas`

#### Example response

`{"circuitNames": ["NAND", "NOR", "SuperSpecialGate"]}`

### POST /saveCircuit

Saves a circuit to the account currently logged into

#### Resource Information

<table>
    <tr>
        <th>Response formats</th>
        <th>Requires authentication?</th>
        <th>Rate limited?</th>
    </tr>
    <tr>
        <td>JSON</td>
        <td>Yes</td>
        <td>No</td>
    </tr>
</table>

#### Parameters

<table>
    <tr>
        <th>Name</th>
        <th>Required</th>
        <th>Description</th>
        <th>Default value</th>
        <th>Example</th>
    </tr>
    <tr>
        <td>username</td>
        <td>required</td>
        <td>The username identifies which JSON file to save user circuit data to, alphanumeric</td>
        <td></td>
        <td>thomas</td>
    </tr>
    <tr>
        <td>sessionToken</td>
        <td>required</td>
        <td>Session token used to validate user is authenticated</td>
        <td></td>
        <td>3c38504bb... (64 hex digits)</td>
    </tr>
    <tr>
        <td>circuitName</td>
        <td>required</td>
        <td>The name of the circuit, so it can be identified later, alphanumeric</td>
        <td></td>
        <td>MyXORGate</td>
    </tr>
    <tr>
        <td>circuitData</td>
        <td>required</td>
        <td>Represenation of the circuit, containing the input nodes, output nodes, and circuits/gates that compose the circuit to save</td>
        <td></td>
        <td>See <code>circuit_example_data.json</code></td>
    </tr>
</table>

#### Example request

Send the user to `/saveCircuit` in a web browser, including the username, sessionToken, circuitName, and circuitData parameters:
`127.0.0.1:8090/saveCircuit?username=thomas&sessionToken=<64 hex digits>&circuitName=MyXORGate&circuitData=<data from circuit_example_data.json>`

#### Example response

`{"response": "Saved circuit successfully"}`

## Users

### GET /getUsers

Get a list of usernames and their total circuit download count

#### Resource Information

<table>
    <tr>
        <th>Response formats</th>
        <th>Requires authentication?</th>
        <th>Rate limited?</th>
    </tr>
    <tr>
        <td>JSON</td>
        <td>No</td>
        <td>No</td>
    </tr>
</table>

#### Parameters

No parameters

#### Example request

Send the user to `/getUsers` in a web browser:
`127.0.0.1:8090/getUsers`

#### Example response

`[{"name": "thomas", "totalDownloads": 3}, {"name": "thomas2", "totalDownloads": 5}]`

### GET /getUser

Get a list of circuits and each circuits' download count for under a given username

#### Resource Information

<table>
    <tr>
        <th>Response formats</th>
        <th>Requires authentication?</th>
        <th>Rate limited?</th>
    </tr>
    <tr>
        <td>JSON</td>
        <td>No</td>
        <td>No</td>
    </tr>
</table>

#### Parameters

<table>
    <tr>
        <th>Name</th>
        <th>Required</th>
        <th>Description</th>
        <th>Default value</th>
        <th>Example</th>
    </tr>
    <tr>
        <td>username</td>
        <td>required</td>
        <td>The username of the account to get circuits from, alphanumeric</td>
        <td></td>
        <td>thomas</td>
    </tr>
</table>

#### Example request

Send the user to `/getUser` in a web browser, with the username of who you want to get the circuits from:
`127.0.0.1:8090/getUser?username=thomas`

#### Example response

`[{"circuitName": "NAND", "downloads": 9}, {"circuitName": "XOR", "downloads": 2}]`

### POST /login

Attempt login to an existing account, getting a session token to authenticate future actions if successful

#### Resource Information

<table>
    <tr>
        <th>Response formats</th>
        <th>Requires authentication?</th>
        <th>Rate limited?</th>
    </tr>
    <tr>
        <td>JSON</td>
        <td>No</td>
        <td>No</td>
    </tr>
</table>

#### Parameters

<table>
    <tr>
        <th>Name</th>
        <th>Required</th>
        <th>Description</th>
        <th>Default value</th>
        <th>Example</th>
    </tr>
    <tr>
        <td>username</td>
        <td>required</td>
        <td>The username the account will be identified with, alphanumeric</td>
        <td></td>
        <td>thomas</td>
    </tr>
    <tr>
        <td>password</td>
        <td>required</td>
        <td>8 character or longer password to secure the account</td>
        <td></td>
        <td>password123</td>
    </tr>
</table>

#### Example request

Send the user to `/login` in a web browser, including the username, and password parameters:
`127.0.0.1:8090/login?username=thomas&password=password123`

#### Example response

`{"sessionToken": "3ab3da46a..."}`

### POST /createAccount

Create a new account

#### Resource Information

<table>
    <tr>
        <th>Response formats</th>
        <th>Requires authentication?</th>
        <th>Rate limited?</th>
    </tr>
    <tr>
        <td>JSON</td>
        <td>No</td>
        <td>No</td>
    </tr>
</table>

#### Parameters

<table>
    <tr>
        <th>Name</th>
        <th>Required</th>
        <th>Description</th>
        <th>Default value</th>
        <th>Example</th>
    </tr>
    <tr>
        <td>username</td>
        <td>required</td>
        <td>The username the account will be identified under, alphanumeric</td>
        <td></td>
        <td>thomas</td>
    </tr>
    <tr>
        <td>password</td>
        <td>required</td>
        <td>Password to secure the account</td>
        <td></td>
        <td>password123</td>
    </tr>
</table>

#### Example request

Send the user to `/createAccount` in a web browser, including the username, and password parameters:
`127.0.0.1:8090/createAccount?username=thomasNew&password=password123`

#### Example response

`{"sessionToken": "3ab3da46a..."}`