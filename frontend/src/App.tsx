import { useEffect, useState } from "react";

import type { License } from "./types";

function App() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/licenses")
      .then((res) => res.json())
      .then(setLicenses)
      .catch(() => setError("Failed to load licenses"));
  }, []);

  return (
    <main>
      <h1>VCF License Management</h1>
      {error && <p>{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Product</th>
            <th>Expires On</th>
          </tr>
        </thead>
        <tbody>
          {licenses.map((license) => (
            <tr key={license.id}>
              <td>{license.key}</td>
              <td>{license.product}</td>
              <td>{license.expires_on ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

export default App;
