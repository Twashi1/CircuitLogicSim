DOCS OUT OF DATE
/getUsers should give a list of usernames with how many circuits (and total downloads?) each user has
/getUser should give the list of circuit names with download count each for that given user

# API reference index

## Circuits
- GET /getCircuits
- GET /getCircuit
- POST /saveCircuit

## Users
- POST /login
- POST /createAccount
- GET /getUsers
- GET /getUser

# API

## Circuits
### GET /getCircuits
Returns list of all circuits saved to the user's account

#### Resource Information
<table>
    <tr>
        <th>Response formats</th>
        <th>Requires authentication?</th>
        <th>Rate limited?</th>
    </tr>
    <tr>
        <td>STRING</td>
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
        <td>The username identifies which JSON file to get user circuit data from, alphanumeric</td>
        <td></td>
        <td>thomas</td>
    </tr>
    <tr>
        <td>sessionID</td>
        <td>required</td>
        <td>Session token used to validate user is authenticated</td>
        <td></td>
        <td>64 digit hexadecimal string (too long)</td>
    </tr>
</table>

#### Example request
Send the user to `/getCircuits` in a web browser, including the username and sessionID parameters:
`127.0.0.1:8090/getCircuits?username=thomas&sessionID=(some 64 hex string)`

#### Example response
See `circuit_example_data.json`

### POST /saveCircuit
Saves a circuit to a certain account inside a JSON file, so it can be reused

#### Resource Information
<table>
    <tr>
        <th>Response formats</th>
        <th>Requires authentication?</th>
        <th>Rate limited?</th>
    </tr>
    <tr>
        <td>STRING</td>
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
        <td>sessionID</td>
        <td>required</td>
        <td>Session token used to validate user is authenticated</td>
        <td></td>
        <td>64 digit hexadecimal string (too long)</td>
    </tr>
    <tr>
        <td>circuitName</td>
        <td>required</td>
        <td>The name under which the circuit data will be saved, alphanumeric</td>
        <td></td>
        <td>MyXORGate</td>
    </tr>
    <tr>
        <td>circuitData</td>
        <td>required</td>
        <td>JSON structure containing the input nodes, output nodes, and circuits that compose the circuit to save</td>
        <td></td>
        <td>See <i>circuit_example_data.json</i> (too long)</td>
    </tr>
</table>

#### Example request
Send the user to `/saveCircuit` in a web browser, including the username, sessionID, circuitName, and circuitData parameters:
`127.0.0.1:8090/saveCircuit?username=thomas&sessionID=(some 64 hex string)&circuitName=MyXORGate&circuitData=(data from circuit_example_data.json)`

#### Example response
"Circuit saved successfully"

## Users
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
        <td>STRING</td>
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
Send the user to `/login` in a web browser, including the username, and password parameters:
`127.0.0.1:8090/login?username=thomas&password=password123`

#### Example response
Some 64 digit hex string

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
        <td>STRING</td>
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
`127.0.0.1:8090/login?username=thomasNew&password=password123`

#### Example response
Some 64 digit hex string