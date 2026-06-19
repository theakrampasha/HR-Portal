from fastapi import APIRouter
import json
import os

router = APIRouter()

@router.get("/api/form-schema")
def get_form_schema():
    try:
        # Load the schema from the root of the backend folder
        schema_path = os.path.join(os.getcwd(), "form_schema.json")
        if not os.path.exists(schema_path):
            return {"success": False, "error": "Schema not found"}
            
        with open(schema_path, "r") as f:
            schema = json.load(f)
            
        return {"success": True, "schema": schema}
    except Exception as e:
        return {"success": False, "error": str(e)}
