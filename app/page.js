export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", margin: "4rem auto", maxWidth: "48rem", padding: "0 1.5rem" }}>
      <h1>NetEase Music MCP</h1>
      <p>
        This deployment exposes a Streamable HTTP MCP endpoint at <code>/api/mcp</code>.
      </p>
      <p>
        Configure an MCP-aware client with the deployed URL plus <code>/api/mcp</code>.
        If <code>MCP_AUTH_TOKEN</code> is set, send it as a bearer token.
      </p>
    </main>
  );
}
