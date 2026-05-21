import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";

describe("App", () => {
  it("renders the local dashboard", () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    expect(screen.getByRole("heading", { name: /panel inicial/i })).toBeInTheDocument();
    expect(screen.getByText(/local-only/i)).toBeInTheDocument();
    expect(screen.getByText(/cargar deck list/i)).toBeInTheDocument();
  });
});
