# Developer setup documentation

## IMPORTANT, DEVELOPERS READ THIS FIRST

Transcrobes has a LOT of heavy-duty moving parts, both in development and production. There is no practical way around this, at least at this stage, if we want to have high-performance, high-quality software. There are several very large images (Chinese NLP models, database, etc) - you will need _at least_ 5GB of free disk space. Your machine will need _at least_ 8GB of RAM, 16GB is better to avoid any risk of swapping and if you want to run all this in a VM, 32GB better still.

It takes a while to set up but once it is, development and iterating is very quick and painless.

Before you try and set up and run locally, you should [get in touch via one of the means in the documentation](https://transcrob.es/page/development/). Because there are so many moving parts, the setup instructions (below) may not be completely up-to-date, so please avoid any frustration and wasted time and [get in touch before you start](https://transcrob.es/page/development/).

Developing for Transcrobes is designed to be done locally with `docker-compose` and deploying to production on `kubernetes`. `podman`'s `docker-compose` compatibility-layer can be made to work but is far too flaky to be officially supported and definitely only works when run as root.

## Technical notes

This project was originally bootstraped from the [tiangolo/full-stack-fastapi-postgresql](https://github.com/tiangolo/full-stack-fastapi-postgresql) Github repo. However, it has undergone very significant changes (like using `react` and not `vue` for the frontend) and many things have been tweaked as a result.

Unlike the initial template, this project is intended to be deployed to production on `kubernetes`, _not_ `docker-swarm`. You can find the deployment project [here](https://github.com/transcrobes/charts). `kubernetes` is currently the only supported production deployment platform for `transcrobes`.

The supported versions of the two project languages (`python` and `nodejs`) are provided in the `.tool-versions` file. This file can be used by [`asdf`](https://asdf-vm.com/), and that is (definitely) the recommended way of developing for this project.

## Backend Requirements

You will need to install the following on your development machine and be familiar with how they work. All commands listed here should be run on `bash` (they might work elsewhere but aren't supported).

- [Docker](https://www.docker.com/).
- [Docker Compose](https://docs.docker.com/compose/install/).
- [Poetry](https://python-poetry.org/) for Python package and environment management.
- Python 3.10+

## Frontend Requirements

- Node.js 16+ (with `npm`).

## Run the backend locally

You _need_ to make a copy of `docker-compose.override.yml.example` to `docker-compose.override.yml` and enable at least `nginx` to listen on a port on your machine so you can access the site locally. It doesn't have to be the default port `80` but has only been thoroughly tested with that. See [here for more details](#docker-compose-and-overrides).

You _need_ to make a copy of `.env.example` to `.env`. The superadmin user (which you set in the `.env` file with `FIRST_SUPERUSER` and `FIRST_SUPERUSER_PASSWORD`) is created by default, and you can use that as a learner also.

You currently _need_ a Microsoft Azure Text Translator API key, and while they give you up to 2 million characters of lookup/translation free every month, it does require a valid, "proper" credit card (you can't use temporary/obfuscated numbers). If you sign up for the free tier they will NOT charge you if you hit the limit - they will stop translating. For them to charge your card you _need_ to manually change to a different tier. It's also MS we're talking about here, so they aren't going to try anything dodgy (as much as they were horrible in the past, their Azure service is _very_ hard to fault...). If you know about Marian NMT and want to contribute a CPU optimised build and Mandarin to English model, that would be very welcome indeed!

The maintainer has a couple of keys that can be used for development purposes if you don't have a credit card or refuse to give it to MS. [Get in touch if you need an API key](https://transcrob.es/page/development/).

You don't _need_ to change any of the other defaults.

If you want to create a "normal" user/learner account, you _need_ to put in SMTP details. Any service that allows you to use standard SMTP should work, provided that can deliver to your desired destination email account. In theory, you could create an account with a fake SMTP and then manually update the database to validate the email address but you are probably better just using the default `admin` account until you can do that yourself!

You _should_ also make copies of `frontend/.env.production.local.example` to `frontend/.env.production.local` and `frontend/.env.development.local.example` to `frontend/.env.development.local`. But again, you don't _need_ to change any of the defaults.

## Build the initial base images

The base images need to be built and then rebuilt again later when deps update.

```bash
set -e; for i in base backend web worker sworker backups; do TRANSCROBES_DOCKER_REPO=transcrobes bash scripts/build-${i}.sh; done
```

Start the stack with Docker Compose:

```bash
docker-compose up -d
```

**Note**: The first time you start your stack, it will take several minutes for it to be ready. You will definitely need to run `docker-compose up -d` at least a couple of times before all images start properly (some images report ready before they truly are).

To check the logs, run:

```bash
docker-compose logs
```

To check the logs of a specific service, add the name of the service, e.g.:

```bash
docker-compose logs backend
```

## Run the platform services

First create a couple of directories:

```bash
mkdir -p frontend/dist/{site,static}
```

Once everything _appears_ properly started, you will then have to stop everything and start it again (it's not _actually_ properly started...).

```bash
docker-compose down
docker-compose up -d  # and again, you might need to run this a couple of times to get all containers started
```

Once you see all services report `up-to-date` when you execute `docker-compose up -d`, you should be finally good to go.

Obviously none of this is necessary when deployed to `kubernetes`, which is a proper container orchestrator! Originally development was attempted pointing to a `microk8s` (and later `k3s`) but it wasn't nearly as practical day-to-day and is constantly using a lot of CPU.

## Database bootstrap

You now need to seed the database with the initial dictionary data and some default wordlists, etc. This was originally provided publicly but keeping things up-to-date was far, far too much work. [Get in touch with the maintainer who will provide postgres sql dumps to import](https://transcrob.es/page/development/). Publicly available dumps will be made available if significant interest materialises and resources permit. You will get an archive with several `.sql` files which you extract and then:

```bash
for i in *.sql; do psql -h localhost -p 15432 -U postgres tcapp < $i; done
```

This assumes you have `psql` installed locally on the development machine and have copied the default `.example` files and not changed them. Adapt this if you want to use the postgres server container `psql`.

## Server initilisation

You can now open your browser and interact with the backend. Automatic interactive documentation with the Swagger UI (from the OpenAPI backend): http://localhost/docs

You should now log in to this interface with the admin user using the Swagger UI (top right of the screen "Authorize"), and then navigate to http://localhost/docs#/enrich/api_regenerate_all_api_v1_enrich_regenerate_all_get.

Learners download an initial, pregenerated copy of a lot of dictionary-type resources (so almost everything can work offline), and these are pregenerated on a daily basis via an internal cron (you _don't_ need to set this up). Because it hasn't already been generated, you can manually force generation of these with this interface. After logging in as an admin, simply click the "Try it out" button for `/api/v1/enrich/regenerate_all`, then click the "Execute" button. This might take up to a couple of minutes to finish.

Frontend: See [the end of this document](#frontend-development)

## Backend local development, additional details

### General workflow

Because developers can get pretty exotic with their tastes, it is impossible to cater to everyone. If you know what you're doing, then you should be able to work out how to do anything your preferred way.

The maintainer uses [asdf](https://asdf-vm.com/), which allows for very easy, isolated management of all the languages used for the project. The project includes a `.tool-versions` file that contains the currently supported versions of `python` and `node`. These will very likely be the latest supported `lts` versions.

By default, the backend/python dependencies are managed with [Poetry](https://python-poetry.org/), go there and install it.

From the repo root you can install all the backend dependencies with:

```console
poetry install
```

Then you can start a shell session with the new environment with:

```console
poetry shell
```

Development works well with VSCode which, whether you like it or not, has [become a kind of defacto standard for web development](https://survey.stackoverflow.co/2022/#most-popular-technologies-new-collab-tools).

> :exclamation: the project contains soft links from `./pyproject.toml` and `./poetry.lock` to real files in `./backend/app/`, making it easy to open `vscode` at the root and to have both the backend and frontend open and pointing to the right language envs (`node` and `python`).

Make sure your editor uses the environment you just created with Poetry.

Modify or add SQLAlchemy models in `./backend/app/app/models/`, Pydantic schemas in `./backend/app/app/schemas/`, API endpoints in `./backend/app/app/api/`, CRUD (Create, Read, Update, Delete) utils in `./backend/app/app/crud/`.

Add and modify tasks for the Faust worker in `./backend/app/app/fworker.py`, and for the stats worker in `./backend/app/app/sworker.py`.

If you need to install any additional system package to the either of the workers, add it to the relevant `dockerfile` (at the project root, see `Dockerfile.*`).

### Docker Compose and overrides

During development, you can change Docker Compose settings outside `git` that only affect the local development environment in `docker-compose.override.yml`. There is a default example with `docker-compose.override.yml.example` which you can copy that exposes the ports of most services, including `nginx` on port 80. Your `docker` will obviously require the permissions to do that. The ports are not exposed by default to reduce the likelihood of conflicting with an existing open port on your workstation. While it should work fine if you expose on another port, only port `80` has been thoroughly tested.

The directory with the backend code is mounted as a Docker "host volume", mapping the code you change live to the directory inside the container. That allows you to test your changes right away, without having to build the Docker image again.

### Test Coverage

There was quite good test coverage in a previous version (based on `Django`) but since then unit tests have not been actively developed. This is obviously extremely suboptimal and the maintainer is fully prepared for any and all insults that any serious engineer might want to throw his way...

### Migrations

As during local development your app directory is mounted as a volume inside the container, you can also run the migrations with `alembic` commands inside the container and the migration code will be in your app directory (instead of being only inside the container). You can add then it to git.

Make sure you create a "revision" of your models and that you "upgrade" your database with that revision every time you change them. As this is what will update the tables in your database. Otherwise, your application will have errors.

If you create a new model in `./backend/app/app/models/`, make sure to import it in `./backend/app/app/db/base.py`, that Python module (`base.py`) that imports all the models will be used by Alembic.

After changing a model (for example, adding a column), inside the container, create a revision, e.g.:

```bash
docker-compose run backend alembic -c alembic.main.ini revision --autogenerate -m "A descriptive message"
```

Commit the files generated in the alembic directory to git.

After creating the revision the update should run automatically, if it doesn't or you have changed the default script, run the migration manually:

```bash
docker-compose run backend alembic upgrade head
```

Alternatively, you can restart the backend with

```bash
docker-compose restart backend
```

Which will also run the upgrade.

The (completely separate) stats database uses a separate `alembic` `ini` file, `alembic.stats.ini`, and if you update a stats model (see `app/app/models/stats.py`) then you should run an update using this ini file, like so:

```bash
docker-compose run backend alembic -c alembic.stats.ini revision --autogenerate -m "A descriptive stats message"
```

Again, the migration should run automatically after this but you can run it manually or restart if it doesn't.

## Frontend development

Enter the `frontend` directory, install the NPM packages and start the live server using the `npm` scripts:

```bash
cd frontend
npm install --legacy-peer-deps
npm run build:dev
```

Then open your browser at http://localhost. Any changes to frontend code will cause a recompile to start.

Notice that this live server is not running inside Docker, it is for local development, and that is the recommended workflow.

Check the file `package.json` to see other available options.

> :exclamation: Yes, frontend compile time is _embarassingly_ slow (minimum of 20-30s for dev mode, up to 2mins for prod). Sigh. `webpack` is very slow, that's life. Many, many entire days were spent trying to get everything working properly using various other systems (`vite`, `parcel`) but they are either written by ayatollahs who will never make any compromises (like `vite`) or are only half-baked/abandoned (like `parcel`), and definitely nothing has the support that `webpack` has everywhere. It _might_ be possible to migrate to something but the maintainer has used up all his JS frustration budget for the next couple of years... If you can guarantee to support and maintain it, any other system would be a welcome change!
