import { useEffect, useState } from "react";
import { fetchEndpointMetrics } from "../api";

export default function EndpointTable() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchEndpointMetrics().then(setData);
  }, []);

  return (
    <>
      <h2>Endpoint Activity (Last 5 min)</h2>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Service</th>
            <th>Endpoint</th>
            <th>Total</th>
            <th>Hits</th>
            <th>Misses</th>
            <th>Hit %</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.service}</td>
              <td>{row.endpoint}</td>
              <td>{row.total_requests}</td>
              <td>{row.cache_hits}</td>
              <td>{row.cache_misses}</td>
              <td>{(row.hit_ratio * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
