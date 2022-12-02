const fetch = require("node-fetch")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HASURA_OPERATION = `
mutation InsertUserTracking($user_id: Int, $lat: Float, $lon:Float) {
  insert_docker_app_user_tracking(objects: {user_id: $user_id, lat: $lat , lon:$lon}) {
    affected_rows
    returning {
      id
			user_id
			lat
			lon
    }
  }
}
    
`;

// execute the parent mutation in Hasura
const execute = async (variables, reqHeaders) => {
  const fetchResponse = await fetch(
    "https://noble-yak-63.hasura.app/v1/graphql",
    {
      method: 'POST',
      headers: reqHeaders || {},
      body: JSON.stringify({
        query: HASURA_OPERATION,
        variables
      })
    }
  );
  return await fetchResponse.json();
};
  

// Request Handler
const handler = async (req, res) => {

  // get request input
  const { user_id, lat, lon } = req.body.input;


  // execute the Hasura operation
  const { data, errors } = await execute({ user_id, lat, lon }, req.headers);

  // if Hasura operation errors, then throw error
  if (errors) {
    return res.status(400).json({
      message: errors.message
    })
  }

  const tokenContents = {
    sub: data.insert_docker_app_user.id.toString(),
    iat: Date.now() / 1000,
    iss: 'https://myapp.com/',
    "https://hasura.io/jwt/claims": {
      "x-hasura-allowed-roles": ["user"],
      "x-hasura-user-id": data.insert_users_one.id.toString(),
      "x-hasura-default-role": "user",
      "x-hasura-role": "user"
    },
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  }

  const token = jwt.sign(tokenContents, process.env.ENCRYPTION_KEY);

  // success
  return res.json({
    ...data.insert_docker_app_user,
    token: token
  })

}

module.exports = handler;