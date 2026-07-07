## Overview

A fully functional  and scalable dashboard starter solution for saas and businesess in general

### Login Credentials
NOTE: Use this Email and password to **Login!**

- **Email:** `eve.holt@reqres.in`
- **Password:** `password`

## features
- customizable UI using `Tailwindcss` and `Ant Design`.
- Single page application using `React Router`.
- Mock API request using `reqres`.
- Powerful layout and table using `@ant-design/pro-components`.
- Code splitting and lazy loading component using `@loadable/component`.
- State management using `react-redux` and `@reduxjs/toolkit`.
- Persistent redux state using `redux-persist`.
- Loading progress bar using `nprogress`.
- `ESLint` and `Prettier` enabled.
- Option to enable Progressive Web App (PWA). (Only available in production build)
- Axios interceptor enabled to handle API authorization.
- Automated workflow for checking new Pull Request.


## Usage

- Clone the project and change directory.

  ```shell
  git clone https://github.com/iBz-04/Dashboard-starter.git
  cd Dashboard-starter
  ```

- Install dependencies.

  ```shell
  cd dashboard
  pnpm install
  ```

- Create your environment file.

  ReqRes now requires a free API key for all `/api/*` requests.

  1. Get a key from [app.reqres.in/api-keys](https://app.reqres.in/api-keys)
  2. Copy `.env.example` to `.env`
  3. Paste your key into `VITE_REQRES_API_KEY`

  ```shell
  cp .env.example .env
  ```

- Run dev server.

  ```shell
  pnpm run dev
  ```

- Then, visit [`http://localhost:5173`](http://localhost:5173)

## Feedback

If you have any feedback, please reach out to us ibz.04dev@gmail.com


## Author

- [@iBz-04](https://github.com/iBz-04)
