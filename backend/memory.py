# Simple in-memory conversation history

conversation_history = []


def add_message(role, content):
    conversation_history.append({
        "role": role,
        "content": content
    })

    # Keep only last 10 messages
    if len(conversation_history) > 10:
        conversation_history.pop(0)


def get_history():
    text = ""

    for msg in conversation_history:
        text += f"{msg['role']}: {msg['content']}\n"

    return text