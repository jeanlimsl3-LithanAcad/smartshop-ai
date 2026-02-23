// src/App.jsx
import { useEffect, useState } from "react";

const BACKEND_URL = "http://127.0.0.1:8000";

// Helper to build full image URL
function getImageUrl(imageField) {
  if (!imageField) return null;
  if (imageField.startsWith("http")) return imageField;
  return `${BACKEND_URL}${imageField}`;
}

function App() {
  // ---------- Product list ----------
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);

  // ---------- Product detail modal ----------
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // AI review summary (inside modal) – structured object
  // { summary: string | null, pros: string[], cons: string[], sentiment: string | null }
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState(null);
  const [summaryError, setSummaryError] = useState(null);

  // ---------- Smart Search ----------
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchExplanation, setSearchExplanation] = useState("");
  const [searchError, setSearchError] = useState(null);

  // ---------- Chat Assistant ----------
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);

  // ============================================
  // 1. Load products on mount
  // ============================================
  useEffect(() => {
    async function loadProducts() {
      setProductsLoading(true);
      setProductsError(null);
      try {
        const res = await fetch(`${BACKEND_URL}/api/products/`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error("Error loading products:", err);
        setProductsError(
          "Failed to load products. Please make sure the backend is running."
        );
      } finally {
        setProductsLoading(false);
      }
    }

    loadProducts();
  }, []);

  // ============================================
  // 2. Product detail modal handlers
  // ============================================
  function openProductModal(product) {
    setSelectedProduct(product);
    setShowModal(true);
    setSummaryText(null);
    setSummaryError(null);
  }

  function closeProductModal() {
    setShowModal(false);
    setSelectedProduct(null);
    setSummaryText(null);
    setSummaryError(null);
    setSummaryLoading(false);
  }

  // Average rating helper
  function getAverageRating(product) {
    const reviews = product.reviews || [];
    if (!reviews.length) return null;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return (sum / reviews.length).toFixed(1);
  }

  // ============================================
  // 3. Generate AI review summary (structured)
  // ============================================
  async function handleGenerateSummary() {
    if (!selectedProduct) return;
    setSummaryLoading(true);
    setSummaryError(null);
    setSummaryText(null);

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/products/${selectedProduct.id}/review-summary/`
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();

      // Store structured data from backend
      setSummaryText({
        summary: data.summary || null,
        pros: Array.isArray(data.pros) ? data.pros : [],
        cons: Array.isArray(data.cons) ? data.cons : [],
        sentiment: data.sentiment || null,
      });
    } catch (err) {
      console.error("Summary error:", err);
      setSummaryError(
        "AI service error: " + (err.message || "Failed to generate summary.")
      );
    } finally {
      setSummaryLoading(false);
    }
  }

  // ============================================
  // 4. Smart Search
  // ============================================
  async function handleSmartSearch() {
    const q = searchQuery.trim();
    if (!q) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    setSearchExplanation("");

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/search/?q=${encodeURIComponent(q)}`
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSearchResults(data.results || []);
      setSearchExplanation(data.explanation || "");
    } catch (err) {
      console.error("Smart search error:", err);
      setSearchError(
        "Failed to run smart search. Please try again in a moment."
      );
    } finally {
      setSearchLoading(false);
    }
  }

  function handleResetSearch() {
    setSearchQuery("");
    setSearchResults([]);
    setSearchExplanation("");
    setSearchError(null);
  }

  // ============================================
  // 5. Chat Assistant
  // ============================================
  async function handleSendChat(e) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    setChatError(null);
    setChatLoading(true);

    // Show user message immediately
    setChatMessages((prev) => [...prev, { from: "user", text }]);
    setChatInput("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/assistant/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const bodyText = await res.text();
        throw new Error(bodyText || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply = data.reply || "Sorry, I couldn't generate a reply.";
      setChatMessages((prev) => [...prev, { from: "assistant", text: reply }]);
    } catch (err) {
      console.error("Chat error:", err);
      setChatError(
        "Chat service error: " + (err.message || "Failed to contact assistant.")
      );
    } finally {
      setChatLoading(false);
    }
  }

  // ============================================
  // 6. Render helpers
  // ============================================
  const listToRender =
    searchResults.length > 0 || searchExplanation || searchError
      ? searchResults
      : products;

  function sentimentBadgeClass(sentiment) {
    if (!sentiment) return "bg-secondary";
    const s = sentiment.toLowerCase();
    if (s.includes("positive")) return "bg-success";
    if (s.includes("negative")) return "bg-danger";
    return "bg-warning text-dark";
  }

  // ============================================
  // 7. Render
  // ============================================
  return (
    <div className="bg-light min-vh-100 d-flex flex-column">
      {/* Header / Branding */}
      <nav
        className="navbar navbar-dark shadow-sm"
        style={{
          background:
            "linear-gradient(90deg, #0052CC 0%, #2563EB 40%, #4F46E5 100%)",
        }}
      >
        <div className="container d-flex justify-content-between">
          <span className="navbar-brand fw-semibold">SmartShop AI</span>
          <span className="text-white-50 small">
            AI-Powered Product Insights
          </span>
        </div>
      </nav>

      <main className="container my-4 flex-grow-1">
        {/* Smart Search Section */}
        <section className="mb-4">
          <h5 className="mb-3">Smart Search</h5>
          <div className="card shadow-sm mb-2">
            <div className="card-body">
              <div className="row g-2 align-items-center">
                <div className="col-md-8">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search for 'headphones', 'fitness watch under $100', etc."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="col-md-4 d-flex gap-2">
                  <button
                    className="btn btn-primary flex-grow-1"
                    onClick={handleSmartSearch}
                    disabled={searchLoading}
                  >
                    {searchLoading ? "Searching..." : "Run Smart Search"}
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={handleResetSearch}
                    disabled={searchLoading && !searchResults.length}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {searchError && (
                <div className="alert alert-danger mt-3 mb-0 small">
                  {searchError}
                </div>
              )}

              {searchExplanation && (
                <div className="alert alert-info mt-3 mb-0 small">
                  <strong>AI explanation:</strong> {searchExplanation}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Chat Assistant Section */}
        <section className="mb-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">Shopping Assistant</h5>
              <p className="text-muted small mb-3">
                Ask about products, compare options, or get quick suggestions
                (e.g., “Recommend a gift under $50”).
              </p>

              <div
                className="border rounded p-2 mb-3 bg-light chat-window small"
                style={{ maxHeight: "260px", overflowY: "auto" }}
              >
                {chatMessages.length === 0 && (
                  <p className="text-muted mb-0">
                    No messages yet. Start the conversation below!
                  </p>
                )}
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-2 d-flex ${
                      msg.from === "user" ? "justify-content-end" : ""
                    }`}
                  >
                    <div
                      className={
                        "px-3 py-2 rounded-3 " +
                        (msg.from === "user"
                          ? "bg-info text-white"
                          : "bg-white border")
                      }
                      style={{ maxWidth: "75%" }}
                    >
                      <div className="small fw-semibold mb-1">
                        {msg.from === "user" ? "You" : "Assistant"}
                      </div>
                      <div className="small">{msg.text}</div>
                    </div>
                  </div>
                ))}
              </div>

              {chatError && (
                <div className="alert alert-danger small py-2 mb-2">
                  {chatError}
                </div>
              )}

              <form
                className="d-flex gap-2"
                onSubmit={handleSendChat}
                autoComplete="off"
              >
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ask something about SmartShop products..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  className="btn btn-info text-white"
                  disabled={chatLoading || !chatInput.trim()}
                >
                  {chatLoading ? "Sending..." : "Send"}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Products / Search Results */}
        <section className="mb-5">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">
              {searchResults.length > 0 ? "Search Results" : "Products"}
            </h4>
            {productsLoading && (
              <span className="text-muted small">Loading products...</span>
            )}
          </div>

          {productsError && (
            <div className="alert alert-danger">{productsError}</div>
          )}

          {!productsLoading && listToRender.length === 0 && (
            <p className="text-muted">
              No products to display. Try running a different search.
            </p>
          )}

          <div className="row g-4">
            {listToRender.map((product) => {
              const imgUrl = getImageUrl(product.image);
              const avgRating = getAverageRating(product);
              const reviewCount = (product.reviews || []).length;

              return (
                <div className="col-md-6 col-lg-4 d-flex" key={product.id}>
                  <div className="card shadow-sm flex-fill h-100">
                    {imgUrl && (
                      <img
                        src={imgUrl}
                        alt={product.name}
                        className="card-img-top"
                        style={{
                          height: "200px",
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <div className="card-body d-flex flex-column">
                      <h5 className="card-title">{product.name}</h5>
                      <p className="card-text mb-1">
                        <strong>Price:</strong> ${product.price}
                      </p>
                      {product.category && (
                        <p className="card-text mb-1">
                          <strong>Category:</strong> {product.category.name}
                        </p>
                      )}

                      {avgRating && (
                        <p className="card-text mb-2">
                          <span className="text-warning me-1">★</span>
                          <strong>{avgRating}</strong>
                          <span className="text-muted small ms-1">
                            ({reviewCount}{" "}
                            {reviewCount === 1 ? "review" : "reviews"})
                          </span>
                        </p>
                      )}

                      <p className="card-text text-muted small flex-grow-1">
                        {product.description}
                      </p>

                      <button
                        className="btn btn-outline-primary mt-2"
                        onClick={() => openProductModal(product)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-dark text-light py-3 mt-auto">
        <div className="container text-center small">
          SmartShop AI · Demo prototype for AI-powered e-commerce
        </div>
      </footer>

      {/* Product Detail Modal (simple overlay) */}
      {showModal && selectedProduct && (
        <div
          className="modal d-block"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
          onClick={closeProductModal}
        >
          <div
            className="modal-dialog modal-xl modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{selectedProduct.name}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeProductModal}
                ></button>
              </div>

              <div className="modal-body">
                <div className="row g-4 mb-3">
                  <div className="col-md-5">
                    {getImageUrl(selectedProduct.image) && (
                      <img
                        src={getImageUrl(selectedProduct.image)}
                        alt={selectedProduct.name}
                        className="img-fluid rounded"
                        style={{ maxHeight: "320px", objectFit: "cover" }}
                      />
                    )}
                  </div>
                  <div className="col-md-7">
                    <p className="mb-1">
                      <strong>Price:</strong> ${selectedProduct.price}
                    </p>
                    {selectedProduct.category && (
                      <p className="mb-1">
                        <strong>Category:</strong>{" "}
                        {selectedProduct.category.name}
                      </p>
                    )}

                    {getAverageRating(selectedProduct) && (
                      <p className="mb-1">
                        <span className="text-warning me-1">★</span>
                        <strong>{getAverageRating(selectedProduct)}</strong>
                        <span className="text-muted small ms-1">
                          (
                          {(selectedProduct.reviews || []).length}{" "}
                          {(selectedProduct.reviews || []).length === 1
                            ? "review"
                            : "reviews"}
                          )
                        </span>
                      </p>
                    )}

                    <p className="mt-3">
                      {selectedProduct.description ||
                        "No description available."}
                    </p>
                  </div>
                </div>

                {/* Reviews */}
                <h6 className="mb-2">Customer Reviews</h6>
                {(selectedProduct.reviews || []).length === 0 ? (
                  <p className="text-muted small">
                    No reviews for this product yet.
                  </p>
                ) : (
                  <div className="list-group mb-3">
                    {selectedProduct.reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="list-group-item border-0 border-bottom"
                      >
                        <div className="d-flex justify-content-between">
                          <strong>{rev.user_name || "Anonymous"}</strong>
                          <span className="badge bg-warning text-dark">
                            ★ {rev.rating}/5
                          </span>
                        </div>
                        <p className="mb-1 small">{rev.comment}</p>
                        {rev.created_at && (
                          <small className="text-muted">
                            {new Date(rev.created_at).toLocaleString()}
                          </small>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Review Summary */}
                <h6 className="mb-2">AI Review Summary</h6>
                <div className="d-flex mb-2">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleGenerateSummary}
                    disabled={summaryLoading}
                  >
                    {summaryLoading ? "Generating..." : "Generate Summary"}
                  </button>
                </div>

                {summaryError && (
                  <div className="alert alert-danger small py-2">
                    {summaryError}
                  </div>
                )}

                {summaryText && (
                  <div className="alert alert-secondary small mb-0">
                    {summaryText.summary && (
                      <p className="mb-2">
                        <strong>Overall summary:</strong>{" "}
                        {summaryText.summary}
                      </p>
                    )}

                    {Array.isArray(summaryText.pros) &&
                      summaryText.pros.length > 0 && (
                        <div className="mb-2">
                          <strong>Pros:</strong>
                          <ul className="mb-1">
                            {summaryText.pros.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {Array.isArray(summaryText.cons) &&
                      summaryText.cons.length > 0 && (
                        <div className="mb-2">
                          <strong>Cons:</strong>
                          <ul className="mb-1">
                            {summaryText.cons.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {summaryText.sentiment && (
                      <p className="mb-0">
                        <strong>Sentiment:</strong>{" "}
                        <span
                          className={
                            "badge ms-1 " +
                            sentimentBadgeClass(summaryText.sentiment)
                          }
                        >
                          {summaryText.sentiment}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeProductModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;