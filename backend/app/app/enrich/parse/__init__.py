# -*- coding: utf-8 -*-
from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from aiohttp_retry import ExponentialRetry, RetryClient
from app.etypes import Model

logger = logging.getLogger(__name__)


class ParseProvider(ABC):
    def __init__(self, config):
        self._config = config

    @abstractmethod
    async def parse(
        self,
        text: str,
        provider_parameters: str = None,
        max_attempts: int = 5,
        max_wait_between_attempts: int = 300,
    ) -> Model:
        """
        Take input, parse (or get done externally) and send back marked up in json format
        """


class HTTPCoreNLPProvider(ParseProvider):
    # override ParseProvider
    async def parse(
        self,
        text: str,
        provider_parameters: str = None,
        max_attempts: int = 5,
        max_wait_between_attempts: int = 300,
    ) -> Model:
        # the max_timeout option is horribly named, it is the wait between attempts, not timeout at all...
        retry_options = ExponentialRetry(attempts=max_attempts, max_timeout=max_wait_between_attempts)
        async with RetryClient(raise_for_status=False, retry_options=retry_options) as client:
            logger.debug("Starting HTTPCoreNLPProvider aparse of: %s", text)
            params = {"properties": provider_parameters or self._config["params"]}
            async with client.post(self._config["base_url"], data=text, params=params) as response:
                response.raise_for_status()
                logger.debug("Finished getting model from CoreNLP via http")
                return await response.json()
