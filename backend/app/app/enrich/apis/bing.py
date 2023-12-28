# -*- coding: utf-8 -*-
from __future__ import annotations

import json  # import orjson as json
import logging
import uuid
from abc import ABC

import aiohttp
from aiohttp_retry import ExponentialRetry, RetryClient

URL_SCHEME = "https://"

logger = logging.getLogger(__name__)


class BingAPI(ABC):
    def __init__(self, config):
        self.from_lang = config["from"]
        self.to_lang = config["to"]
        self._api_key = config["api_key"]
        self._api_host = config["api_host"]

    def default_params(self):
        return {
            "api-version": "3.0",
            "from": self.from_lang,
            "to": self.to_lang,
        }

    # private methods
    @staticmethod
    def _request_json(text: str) -> str:
        requestBody = [{"Text": text}]
        return json.dumps(requestBody, ensure_ascii=False)

    # protected methods
    async def _ask_bing_api(self, content: str, path, params, max_attempts=5, max_wait_between_attempts=30) -> str:
        req_json: str = self._request_json(content)
        logger.debug("Async looking up '%s' in Bing using json: %s", content, req_json[:100])

        headers = {  # leave this here for the moment - we may want to log the trace id properly
            "Ocp-Apim-Subscription-Key": self._api_key,
            "Content-type": "application/json",
            "X-ClientTraceId": str(uuid.uuid4()),
        }
        # the max_timeout option is horribly named, it is the wait between attempts, not timeout at all...
        retry_options = ExponentialRetry(attempts=max_attempts, max_timeout=max_wait_between_attempts)
        conn_retries = 5
        while True:
            async with RetryClient(
                raise_for_status=True,
                retry_options=retry_options,
                connector=aiohttp.TCPConnector(enable_cleanup_closed=True, force_close=True),
            ) as client:
                try:
                    logger.info(f"Bing API request {path=} {content=}")
                    async with client.post(
                        f"{URL_SCHEME}{self._api_host}{path}",
                        data=req_json.encode("utf-8"),
                        params=params,
                        headers=headers,
                    ) as response:
                        text = await response.text()
                        logger.debug("Received '%s' back from Bing", text[:100])
                        return text
                except aiohttp.client_exceptions.ClientOSError as ex:
                    logger.error("Failure to send to Bing API with ClientOSError: %s", content)
                    logger.exception(ex)
                    conn_retries -= 1
                    if conn_retries <= 0:
                        raise
                except aiohttp.client_exceptions.ClientConnectorError:
                    logger.error("Failure to send to Bing API: %s", content)
                    raise
