import fastjsonschema

json_schema = {
    "type": "object",
    "properties": {
        "question": {"type": "string"},
        "answers": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "answer": {"type": "string"},
                    "correct": {"type": "boolean"},
                },
                "required": ["answer", "correct"],
            },
            "minItems": 4,
            "maxItems": 4,
        },
    },
    "required": ["question", "answers"],
}

validate_mcqa = fastjsonschema.compile(json_schema)
