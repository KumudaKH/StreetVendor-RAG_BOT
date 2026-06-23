import ollama

# LLM Intent Classifier Prompt
INTENT_PROMPT = """You are an expert intent classifier for Indian street vendor queries.

Available intents:
- government_scheme (PM SVANidhi, MSME, Udyam, loans, registration)
- digital_payment (UPI, PhonePe, GPay, QR code, payments)
- finance (profit, income, expense, budget)
- marketing (customers, promotion, advertising)
- location (best place to open shop, areas, markets)
- price (vegetable prices, fruit rates, costs)
- general (anything else)

Examples:
Question: How do I apply for PM SVANidhi?
Intent: government_scheme

Question: How to accept Google Pay?
Intent: digital_payment

Question: How to increase customers?
Intent: marketing

Question: What is today's tomato price?
Intent: price

Question: Which market is best for my shop?
Intent: location

Question: How do I calculate profit?
Intent: finance

Question: What is MSME registration?
Intent: government_scheme

Question: How to set up UPI?
Intent: digital_payment

Return ONLY the intent name. No explanation."""


def llm_classify_intent(question):
    """Use LLM to classify intent when keyword detection is uncertain."""
    try:
        response = ollama.chat(
            model="llama3.2:latest",
            options={"temperature": 0.1, "num_predict": 20},
            messages=[
                {"role": "user", "content": INTENT_PROMPT.format(question=question)}
            ]
        )
        intent = response["message"]["content"].strip().lower()
        
        # Validate intent
        valid_intents = [
            "government_scheme", "digital_payment", "finance", 
            "marketing", "location", "price", "general"
        ]
        
        if intent in valid_intents:
            return intent
        return "general"
    except Exception as e:
        print(f"LLM classification error: {e}")
        return "general"


def keyword_detect(question):
    """Fast keyword-based intent detection."""
    q = question.lower()
    
    # PM SVANidhi specific
    if any(word in q for word in [
        "svanidhi", "pm svanidhi", "street vendor loan", "vendor loan"
    ]):
        return "government_scheme", "pm_svanidhi"
    
    # MSME specific
    if any(word in q for word in [
        "msme", "udyam", "micro small medium", "enterprise"
    ]):
        return "government_scheme", "msme"
    
    # Digital payments
    if any(word in q for word in [
        "upi", "qr", "gpay", "google pay", "phonepe", 
        "paytm", "digital payment", "upi pin", "whatsapp pay"
    ]):
        return "digital_payment", "digital_payments"
    
    # General government
    if any(word in q for word in [
        "loan", "mudra", "scheme", "government", "registration"
    ]):
        return "government_scheme", "general"
    
    # Finance
    if any(word in q for word in [
        "profit", "income", "expense", "budget", "money"
    ]):
        return "finance", None
    
    # Marketing
    if any(word in q for word in [
        "marketing", "instagram", "facebook", "promotion", "customer"
    ]):
        return "marketing", None
    
    # Location
    if any(word in q for word in [
        "location", "shop", "where", "area", "market", "place", "bengaluru"
    ]):
        return "location", None
    
    # Price
    if any(word in q for word in [
        "price", "rate", "cost", "how much", "vegetable price"
    ]):
        return "price", None
    
    return None, None


def detect_intent(question):
    """
    Hybrid intent detection: Keyword first, LLM fallback.
    Returns (intent, scheme) tuple.
    """
    # Step 1: Try keyword detection (fast)
    intent, scheme = keyword_detect(question)
    
    if intent is not None:
        print(f"Intent detected via keywords: {intent}, scheme: {scheme}")
        return intent, scheme
    
    # Step 2: Fallback to LLM classifier (accurate)
    print("Using LLM classifier...")
    intent = llm_classify_intent(question)
    print(f"Intent detected via LLM: {intent}")
    
    return intent, None
