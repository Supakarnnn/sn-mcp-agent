import "./App.css";
import { use, useState } from "react";

function App() {
  const [products, setProducts] = useState([
    { id: 1, name: "Product 1", price: 100 },
    { id: 2, name: "Product 2", price: 200 },
    { id: 3, name: "Product 3", price: 300 },
  ]);

  return (
    <>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            {product.name} : {product.price}
          </li>
        ))}
      </ul>
    </>
  );
}

export default App;
