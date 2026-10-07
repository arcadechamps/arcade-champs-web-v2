import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { GuestRoute } from "@/components/GuestRoute";
import * as useAuthHook from "@/hooks/useAuth";

vi.mock("@/hooks/useAuth");

describe("GuestRoute", () => {
  it("renders children when user is signed out", () => {
    vi.spyOn(useAuthHook, "useAuth").mockReturnValue({
      user: null,
      loading: false,
      session: null,
      profile: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <div data-testid="login-content">Login Form</div>
              </GuestRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("login-content")).toBeInTheDocument();
  });

  it("renders nothing while auth state is resolving (loading: true)", () => {
    vi.spyOn(useAuthHook, "useAuth").mockReturnValue({
      user: null,
      loading: true,
      session: null,
      profile: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <Routes>
          <Route
            path="/signup"
            element={
              <GuestRoute>
                <div data-testid="signup-content">Signup Form</div>
              </GuestRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId("signup-content")).not.toBeInTheDocument();
  });

  it("redirects signed-in user to /dashboard", () => {
    vi.spyOn(useAuthHook, "useAuth").mockReturnValue({
      user: { id: "user-123", email: "player@arcadechamps.com" } as any,
      loading: false,
      session: {} as any,
      profile: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <div data-testid="login-content">Login Form</div>
              </GuestRoute>
            }
          />
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId("login-content")).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });

  it("redirects signed-in user to custom redirectTo target if provided", () => {
    vi.spyOn(useAuthHook, "useAuth").mockReturnValue({
      user: { id: "user-123" } as any,
      loading: false,
      session: {} as any,
      profile: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute redirectTo="/contest">
                <div data-testid="login-content">Login Form</div>
              </GuestRoute>
            }
          />
          <Route path="/contest" element={<div data-testid="contest-page">Contests</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId("login-content")).not.toBeInTheDocument();
    expect(screen.getByTestId("contest-page")).toBeInTheDocument();
  });

  it("redirects signed-in user to previous non-auth location if present in state", () => {
    vi.spyOn(useAuthHook, "useAuth").mockReturnValue({
      user: { id: "user-123" } as any,
      loading: false,
      session: {} as any,
      profile: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter
        initialEntries={[
          { pathname: "/login", state: { from: { pathname: "/leaderboard" } } },
        ]}
      >
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <div data-testid="login-content">Login Form</div>
              </GuestRoute>
            }
          />
          <Route path="/leaderboard" element={<div data-testid="leaderboard-page">Leaderboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId("login-content")).not.toBeInTheDocument();
    expect(screen.getByTestId("leaderboard-page")).toBeInTheDocument();
  });

  it("ignores auth path in location.state.from to avoid redirect loops", () => {
    vi.spyOn(useAuthHook, "useAuth").mockReturnValue({
      user: { id: "user-123" } as any,
      loading: false,
      session: {} as any,
      profile: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter
        initialEntries={[
          { pathname: "/signup", state: { from: { pathname: "/login" } } },
        ]}
      >
        <Routes>
          <Route
            path="/signup"
            element={
              <GuestRoute>
                <div data-testid="signup-content">Signup Form</div>
              </GuestRoute>
            }
          />
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId("signup-content")).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });
});
