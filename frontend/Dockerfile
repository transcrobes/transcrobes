# Stage 0, "build-stage", based on Node.js, to build and compile the frontend
# FROM tiangolo/node-frontend:10 as build-stage
FROM node:16 as build-stage

WORKDIR /app

COPY package*.json /app/
COPY yarn.lock /app/

RUN yarn install

COPY ./ /app/

# ARG FRONTEND_ENV=production

# ENV VUE_APP_ENV=${FRONTEND_ENV}

# Comment out the next line to disable tests
# RUN npm run test:unit

RUN yarn build

# Stage 1, based on Nginx, to have only the compiled app, ready for production with Nginx
FROM nginx:1.21

COPY --from=build-stage /app/build/ /usr/share/nginx/html

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY ./nginx-backend-not-found.conf /etc/nginx/extra-conf.d/backend-not-found.conf
