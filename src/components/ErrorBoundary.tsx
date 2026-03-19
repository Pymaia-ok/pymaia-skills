import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import i18n from "@/i18n/index";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const t = i18n.t.bind(i18n);
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold mb-4">😵</h1>
            <h2 className="text-xl font-semibold mb-2 text-foreground">
              {t("errors.somethingWrong", "Algo salió mal")}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              {t("errors.unexpectedError", "Ocurrió un error inesperado. Podés volver al inicio e intentar de nuevo.")}
            </p>
            <Button onClick={this.handleReset}>{t("errors.backToHome", "Volver al inicio")}</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
