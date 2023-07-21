import os

import uvicorn
from uvicorn.supervisors import ChangeReload

if __name__ == "__main__":
    config = uvicorn.Config(
        os.getenv("APP_MODULE"),
        host=os.getenv("HOST"),
        port=int(os.getenv("PORT")),
        log_level=os.getenv("LOG_LEVEL"),
        reload=True,
    )
    server = uvicorn.Server(config)
    server.force_exit = True

    sock = config.bind_socket()
    supervisor = ChangeReload(config, target=server.run, sockets=[sock])
    supervisor.run()
