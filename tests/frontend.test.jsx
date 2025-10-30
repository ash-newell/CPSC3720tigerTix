import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventList from "../frontend/src/components/EventList";

describe("Frontend EventList", () => {
  const mockEvents = [
    { id: 1, name: "Clemson vs FSU", tickets: 10 },
    { id: 2, name: "Spring Concert", tickets: 5 },
  ];

  test("renders event names", () => {
    render(<EventList events={mockEvents} />);
    expect(screen.getByText("Clemson vs FSU")).toBeInTheDocument();
    expect(screen.getByText("Spring Concert")).toBeInTheDocument();
  });

  test("handles booking button click", async () => {
    const user = userEvent.setup();
    render(<EventList events={mockEvents} />);
    const bookButton = screen.getAllByText("Book")[0];
    await user.click(bookButton);
    expect(bookButton).toHaveTextContent(/booking/i);
  });
});