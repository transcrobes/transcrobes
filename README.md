# transcrobes

## Learn a language doing stuff you love

## Introduction

Transcrob.es is an implementation of the Meaningful IO hypothesis - that language is more about identity, more about learning a a new way of being than it is about learning a theoretical set of rules. Learning the supposed rules can be useful for most people at some point but is definitely not "the point of learning a language". However, "learning the rules" is often the point of traditional, exam-focused language courses (like you might have to sit at high school or university, or for an internationally recognised qualification), which is very important for many learners at certain points in their learning journeys. The key practical difference between `transcrobes` and other learning platforms is that exam-focused learning is just _one_ possible goal, and the best way to learn is by creating synergies between all of the goals learners might have (pass year 10 exam, read the Harry Potter novels, watch all the My Little Pony series, learn the words of all the Metallica songs...).

> :warning: `transcrobes` currently only supports learning simplified Mandarin Chinese for native/highly competent speakers of English. Other languages will follow.

## Technical notes

This project was originally bootstraped from the [tiangolo/full-stack-fastapi-postgresql](https://github.com/tiangolo/full-stack-fastapi-postgresql) Github repo. However, it has undergone very significant changes (like using `react` and not `vue` for the frontend) and many things have been tweaked as a result.

Unlike the initial template, this project is intended to be deployed to production on `kubernetes`, _not_ `docker-swarm`. You can find the deployment project [here](https://github.com/transcrobes/charts). `kubernetes` is currently the only supported deployment platform for `transcrobes`.

The supported versions of the two project languages (`python` and `nodejs`) are provided in the `.tool-versions` file. This file can be used by [`asdf`](https://asdf-vm.com/), and that is (definitely) the recommended way of developing for this project.

## Backend Requirements

- [Docker](https://www.docker.com/).
- [Docker Compose](https://docs.docker.com/compose/install/).
- [Poetry](https://python-poetry.org/) for Python package and environment management.

## Frontend Requirements

- Node.js (with `npm`).

## Backend local development

- Start the stack with Docker Compose:

```bash
docker-compose up -d
```

## Temporary hack for local access

In order to access the sites via `http://localhost` you will need to add the following stanza to the `nginx.conf` file (in Debian/Ubuntu):

```
...
http {
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }
...
```

And to activate the following virtualhost:

```
## Default server configuration
#
server {
        listen 80 default_server;
        root /var/www/html;

        server_name _;

        location ~ ^/(api|docs|redoc|subscriptions|api/graphql)(.*) {
                proxy_pass http://127.0.0.1:8880/$1$2;

                client_max_body_size 50M;
                proxy_read_timeout 3600s;
                proxy_send_timeout 3600s;
                proxy_force_ranges on;

                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection $connection_upgrade;
                proxy_set_header Host $host;
        }
        location / {
                client_max_body_size 50M;
                proxy_pass http://127.0.0.1:5000/;
                proxy_read_timeout 60s;
                proxy_send_timeout 60s;
                proxy_force_ranges on;
        }
}
```

This will be migrated to nice `docker-compose` soon.

- Now you can open your browser and interact with these URLs:

Frontend: See the end of this document

Backend, automatic interactive documentation with Swagger UI (from the OpenAPI backend): http://localhost/docs

Alternative automatic documentation with ReDoc (from the OpenAPI backend): http://localhost/redoc

**Note**: The first time you start your stack, it might take a minute for it to be ready. While the backend waits for the database to be ready and configures everything. You can check the logs to monitor it.

To check the logs, run:

```bash
docker-compose logs
```

To check the logs of a specific service, add the name of the service, e.g.:

```bash
docker-compose logs backend
```

If your Docker is not running in `localhost` (the URLs above wouldn't work) check the sections below on **Development with Docker Toolbox** and **Development with a custom IP**.

## Backend local development, additional details

### General workflow

By default, the dependencies are managed with [Poetry](https://python-poetry.org/), go there and install it.

From `./backend/app/` you can install all the dependencies with:

```console
$ poetry install
```

Then you can start a shell session with the new environment with:

```console
$ poetry shell
```

Next, open your editor at `./backend/app/` (instead of the project root: `./`), so that you see an `./app/` directory with your code inside. That way, your editor will be able to find all the imports, etc. Make sure your editor uses the environment you just created with Poetry.

Modify or add SQLAlchemy models in `./backend/app/app/models/`, Pydantic schemas in `./backend/app/app/schemas/`, API endpoints in `./backend/app/app/api/`, CRUD (Create, Read, Update, Delete) utils in `./backend/app/app/crud/`. The easiest might be to copy the ones for Items (models, endpoints, and CRUD utils) and update them to your needs.

Add and modify tasks for the Faust worker in `./backend/app/app/fworker.py`.

If you need to install any additional package to the worker, add it to the file `./backend/app/faustworker.dockerfile`.

### Docker Compose Override

During development, you can change Docker Compose settings that will only affect the local development environment, in the file `docker-compose.override.yml`.

The changes to that file only affect the local development environment, not the production environment. So, you can add "temporary" changes that help the development workflow.

For example, the directory with the backend code is mounted as a Docker "host volume", mapping the code you change live to the directory inside the container. That allows you to test your changes right away, without having to build the Docker image again. It should only be done during development, for production, you should build the Docker image with a recent version of the backend code. But during development, it allows you to iterate very fast.

There is also a command override that runs `/start-reload.sh` (included in the base image) instead of the default `/start.sh` (also included in the base image). It starts a single server process (instead of multiple, as would be for production) and reloads the process whenever the code changes. Have in mind that if you have a syntax error and save the Python file, it will break and exit, and the container will stop. After that, you can restart the container by fixing the error and running again:

```console
$ docker-compose up -d
```

There is also a commented out `command` override, you can uncomment it and comment the default one. It makes the backend container run a process that does "nothing", but keeps the container alive. That allows you to get inside your running container and execute commands inside, for example a Python interpreter to test installed dependencies, or start the development server that reloads when it detects changes, or start a Jupyter Notebook session.

To get inside the container with a `bash` session you can start the stack with:

```console
$ docker-compose up -d
```

and then `exec` inside the running container:

```console
$ docker-compose exec backend bash
```

You should see an output like:

```console
root@7f2607af31c3:/app#
```

that means that you are in a `bash` session inside your container, as a `root` user, under the `/app` directory.

There you can use the script `/start-reload.sh` to run the debug live reloading server. You can run that script from inside the container with:

```console
$ bash /start-reload.sh
```

...it will look like:

```console
root@7f2607af31c3:/app# bash /start-reload.sh
```

and then hit enter. That runs the live reloading server that auto reloads when it detects code changes.

Nevertheless, if it doesn't detect a change but a syntax error, it will just stop with an error. But as the container is still alive and you are in a Bash session, you can quickly restart it after fixing the error, running the same command ("up arrow" and "Enter").

...this previous detail is what makes it useful to have the container alive doing nothing and then, in a Bash session, make it run the live reload server.

### Backend tests

> :warning: **THE FOLLOWING HAS NOT BEEN PROPERLY VALIDATED**

To test the backend run:

```console
$ DOMAIN=backend sh ./scripts/test.sh
```

The file `./scripts/test.sh` has the commands to generate a testing `docker-stack.yml` file, start the stack and test it.

The tests run with Pytest, modify and add tests to `./backend/app/app/tests/`.

#### Local tests

Start the stack with this command:

```Bash
DOMAIN=backend sh ./scripts/test-local.sh
```

The `./backend/app` directory is mounted as a "host volume" inside the docker container (set in the file `docker-compose.dev.volumes.yml`).
You can rerun the test on live code:

```Bash
docker-compose exec backend /app/tests-start.sh
```

#### Test running stack

If your stack is already up and you just want to run the tests, you can use:

```bash
docker-compose exec backend /app/tests-start.sh
```

That `/app/tests-start.sh` script just calls `pytest` after making sure that the rest of the stack is running. If you need to pass extra arguments to `pytest`, you can pass them to that command and they will be forwarded.

For example, to stop on first error:

```bash
docker-compose exec backend bash /app/tests-start.sh -x
```

#### Test Coverage

Because the test scripts forward arguments to `pytest`, you can enable test coverage HTML report generation by passing `--cov-report=html`.

To run the local tests with coverage HTML reports:

```Bash
DOMAIN=backend sh ./scripts/test-local.sh --cov-report=html
```

To run the tests in a running stack with coverage HTML reports:

```bash
docker-compose exec backend bash /app/tests-start.sh --cov-report=html
```

### Migrations

As during local development your app directory is mounted as a volume inside the container, you can also run the migrations with `alembic` commands inside the container and the migration code will be in your app directory (instead of being only inside the container). So you can add it to your git repository.

Make sure you create a "revision" of your models and that you "upgrade" your database with that revision every time you change them. As this is what will update the tables in your database. Otherwise, your application will have errors.

- Start an interactive session in the backend container:

```console
$ docker-compose exec backend bash
```

- If you created a new model in `./backend/app/app/models/`, make sure to import it in `./backend/app/app/db/base.py`, that Python module (`base.py`) that imports all the models will be used by Alembic.

- After changing a model (for example, adding a column), inside the container, create a revision, e.g.:

```console
$ alembic revision --autogenerate -m "Add column last_name to User model"
```

- Commit to the git repository the files generated in the alembic directory.

- After creating the revision, run the migration in the database (this is what will actually change the database):

```console
$ alembic upgrade head
```

If you don't want to use migrations at all, uncomment the line in the file at `./backend/app/app/db/init_db.py` with:

```python
Base.metadata.create_all(bind=engine)
```

and comment the line in the file `prestart.sh` that contains:

```console
$ alembic upgrade head
```

If you don't want to start with the default models and want to remove them / modify them, from the beginning, without having any previous revision, you can remove the revision files (`.py` Python files) under `./backend/app/alembic/versions/`. And then create a first migration as described above.

Check all the corresponding available URLs in the section at the end.

## Frontend development

- Enter the `frontend` directory, install the NPM packages and start the live server using the `npm` scripts:

```bash
cd frontend
npm install
npm run build:dev
```

Then open your browser at http://localhost

Notice that this live server is not running inside Docker, it is for local development, and that is the recommended workflow.

Check the file `package.json` to see other available options.
