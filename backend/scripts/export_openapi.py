"""Write the contract: backend/openapi.json (REST + WebSocket models) and the MSW fixtures.

uv run python scripts/export_openapi.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pydantic import TypeAdapter  # noqa: E402
from pydantic.json_schema import models_json_schema  # noqa: E402

from app.config import BACKEND_DIR, PROJECT_DIR, Config  # noqa: E402
from app.contract.engine import (  # noqa: E402
    ClientMessage,
    EngineEventMessage,
    EngineFrame,
    ServerMessage,
)
from app.contract.examples import ALL_EXAMPLES  # noqa: E402
from app.main import create_app  # noqa: E402

FIXTURES = PROJECT_DIR / "frontend" / "src" / "mocks" / "fixtures" / "examples.json"


def websocket_schemas() -> dict:
    """The socket's message types, added to components.schemas so openapi-typescript sees them."""
    adapters = {
        "ServerMessage": TypeAdapter(ServerMessage),
        "ClientMessage": TypeAdapter(ClientMessage),
    }
    _, defs = models_json_schema(
        [(EngineFrame, "validation"), (EngineEventMessage, "validation")],
        ref_template="#/components/schemas/{model}",
    )
    schemas = dict(defs.get("$defs", {}))
    for name, adapter in adapters.items():
        schema = adapter.json_schema(ref_template="#/components/schemas/{model}")
        schemas.update(schema.pop("$defs", {}))
        schemas[name] = schema
    return schemas


def main() -> None:
    app = create_app(Config(source="replay", keys="record"), start_engine=False)
    spec = app.openapi()
    components = spec.setdefault("components", {}).setdefault("schemas", {})
    for name, schema in websocket_schemas().items():
        components.setdefault(name, schema)
    (BACKEND_DIR / "openapi.json").write_text(json.dumps(spec, indent=2) + "\n", encoding="utf-8")

    examples = {
        name: (
            [item.model_dump(mode="json") for item in value]
            if isinstance(value, list)
            else value.model_dump(mode="json")
        )
        for name, value in ALL_EXAMPLES.items()
    }
    FIXTURES.parent.mkdir(parents=True, exist_ok=True)
    FIXTURES.write_text(json.dumps(examples, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {BACKEND_DIR / 'openapi.json'} and {FIXTURES}")


if __name__ == "__main__":
    main()
