from app.models.data import Content, Import


def get_or_create_content(the_import: Import) -> Content:
    return the_import.content or Content()
