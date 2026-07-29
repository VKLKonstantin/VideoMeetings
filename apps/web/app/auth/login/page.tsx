"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Button,
  Card,
  FieldError,
  Form,
  Input,
  InputGroup,
  Label,
  Spinner,
  TextField,
} from "@heroui/react";
import { ApiError, loginUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setIsPending(true);
    try {
      const { token, user } = await loginUser({ email, password });
      localStorage.setItem("authToken", token);
      localStorage.setItem("authEmail", user.email);
      router.push("/");
    } catch (error) {
      setIsPending(false);
      setErrorMessage(
        error instanceof ApiError
          ? error.status === 401
            ? "Неверный email или пароль."
            : error.message
          : "Не удалось подключиться к серверу. Попробуйте снова.",
      );
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-indigo-50 px-4 py-16 dark:from-black dark:via-zinc-950 dark:to-indigo-950/40">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>Вход</Card.Title>
          <Card.Description>
            Войдите с email и паролем, чтобы продолжить.
          </Card.Description>
        </Card.Header>

        <Form onSubmit={onSubmit}>
          <Card.Content>
            <div className="flex flex-col gap-4">
              {errorMessage ? (
                <Alert aria-live="assertive" role="alert" status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>{errorMessage}</Alert.Title>
                  </Alert.Content>
                </Alert>
              ) : null}

              <TextField isRequired name="email" type="email">
                <Label>Email</Label>
                <Input
                  autoComplete="email"
                  placeholder="you@example.com"
                  variant="secondary"
                />
                <FieldError />
              </TextField>

              <TextField
                isRequired
                name="password"
                type={isPasswordVisible ? "text" : "password"}
              >
                <Label>Пароль</Label>
                <InputGroup variant="secondary">
                  <InputGroup.Input
                    autoComplete="current-password"
                    placeholder="Введите пароль"
                    type={isPasswordVisible ? "text" : "password"}
                  />
                  <InputGroup.Suffix className="pr-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() =>
                        setIsPasswordVisible((visible) => !visible)
                      }
                    >
                      {isPasswordVisible ? "Скрыть" : "Показать"}
                    </Button>
                  </InputGroup.Suffix>
                </InputGroup>
                <FieldError />
              </TextField>
            </div>
          </Card.Content>

          <Card.Footer className="mt-2 flex flex-col gap-4">
            <Button className="w-full" isPending={isPending} type="submit">
              {isPending ? <Spinner color="current" size="sm" /> : null}
              {isPending ? "Вход…" : "Войти"}
            </Button>
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              Нет аккаунта?{" "}
              <Link
                className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                href="/register"
              >
                Зарегистрироваться
              </Link>
            </p>
          </Card.Footer>
        </Form>
      </Card>
    </div>
  );
}
