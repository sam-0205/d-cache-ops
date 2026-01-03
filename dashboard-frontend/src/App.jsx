import ServiceTable from "./components/ServiceTable";
import EndpointTable from "./components/EndpointTable";

export default function App() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>D-CacheOps Dashboard</h1>
      <ServiceTable />
      <EndpointTable />
    </div>
  );
}
