The task is to create two scripts that strictly follow all of the requirements specified in this file.

<rules>
* Don't add any external dependencies
* Use OpenApiService from ./OpenAIService.ts to create embeddings or prompt LLM.
* Use Neo4jService from ./Neo4jService.ts to create nodes, relationships, vector indexes, etc.
* Don't pay attention to `.env` file. It has already been added.
</rules>

<technical_details>
`populate-db.ts`:
* Take all of the users from users.json and create nodes in Neo4j.
    * Properties of the node should be:
        - userId (because we shouldn't use id property which is a restricted property in Neo4j)
        - username
        - access_level
        - is_active
        - lastlog
* Take all of the connections from connections.json and create relationships in Neo4j.'
`find-path.ts`:
* Connect to the Neo4j database and find the shortest path between users with username "Rafał" and "Barbara".
* Print the path constructed with the names of the nodes to go through.
</technical_details>