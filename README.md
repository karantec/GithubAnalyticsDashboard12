# GitHub Explorer – Backend

## Run
    npm install
    # edit .env (set GITHUB_TOKEN + MONGO_URI)
    npm run dev

## Endpoints
| Method | Route | Description |
|---|---|---|
| GET | /api/repos/search?q=react&page=1&per_page=10&sort=stars\|updated&order=desc | Search (cached 5 min) |
| GET | /api/repos/:owner/:repo | Details + 5 commits + 5 contributors + open issues |
| GET | /api/favorites | List saved repos |
| POST | /api/favorites | Save repo (409 on duplicate) |
| DELETE | /api/favorites/:repoId | Remove saved repo |

Send `x-user-id: <any-string>` to keep favourites per browser/user.
