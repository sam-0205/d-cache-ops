import { useEffect, useState } from "react";
import { fetchServiceMetrics } from "../api";

export default function ServiceTable() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchServiceMetrics().then(setData);
  }, []);

  return (
    <>
      <h2>Service Cache Effectiveness (Last 5 min)</h2>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Service</th>
            <th>Total Requests</th>
            <th>Cache Hit %</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.service}>
              <td>{row.service}</td>
              <td>{row.total_requests}</td>
              <td>{(row.cache_hit_ratio * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
