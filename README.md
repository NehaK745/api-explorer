# API Explorer

Browse any REST API from the VS Code sidebar. Pick a base URL, choose which endpoints to show, and open any record in a detail panel without leaving your editor.

<img width="1877" height="815" alt="image" src="https://github.com/user-attachments/assets/40ee2f6a-ec17-446a-8578-04e42ba05d56" />


## Features

- **Sidebar tree view** of the endpoints you choose, loaded lazily when you expand a folder.
- **Detail panel** that opens beside your code with the record's fields in a table, plus a Copy JSON button.
- **Works with any JSON API.** Handles plain arrays, wrapped results like `{ "products": [...] }`, and single objects.
- **Status bar shortcut** showing the current base URL. Click it to change it.
- **Friendly errors** with a 10 second timeout, so a slow or broken API never freezes the editor.

## Getting started

1. Click the **API Explorer** icon in the Activity Bar.
2. Expand a folder to load its items.
3. Click an item to open its details.

The default setup uses the free demo API at `jsonplaceholder.typicode.com`.

## Settings

| Setting | Default | Description |
|---|---|---|
| `apiExplorer.baseUrl` | `https://jsonplaceholder.typicode.com` | Base URL of the API |
| `apiExplorer.resources` | `["posts", "users", "todos"]` | Endpoints shown as folders, e.g. `products` or `users/1/posts` |
| `apiExplorer.queryString` | `_limit=20` | Query string added to every request, e.g. `limit=20` |

Example for another API: set the base URL to `https://dummyjson.com`, resources to `products` and `recipes`, and the query string to `limit=20`.

## Commands

- **API Explorer: Refresh** reloads the tree.
- **API Explorer: Set Base URL** changes the API.

## Limitations

- Read-only: only GET requests.
- No authentication yet. Token support is planned.

## Requirements

Visual Studio Code 1.90 or newer.

## Feedback

Issues and ideas: https://github.com/NehaK745/api-explorer/issues
