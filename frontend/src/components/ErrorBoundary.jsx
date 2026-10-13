// frontend/src/components/ErrorBoundary.jsx
import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">
            Algo salió mal al mostrar esta pantalla
          </p>
          <p className="mt-1">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
