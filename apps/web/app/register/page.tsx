"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Description,
  FieldError,
  Form,
  Input,
  InputGroup,
  Label,
  Spinner,
  TextField,
} from "@heroui/react";
import { ApiError, registerUser } from "@/lib/api";

export default function RegisterPage() {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setIsPending(true);
    try {
      const user = await registerUser({ email, password });
      setRegisteredEmail(user.email);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Couldn't reach the server. Please try again.",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-indigo-50 px-4 py-16 dark:from-black dark:via-zinc-950 dark:to-indigo-950/40">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>Create your account</Card.Title>
          <Card.Description>
            {registeredEmail
              ? "You're all set."
              : "Sign up with your email to start scheduling video meetings."}
          </Card.Description>
        </Card.Header>

        {registeredEmail ? (
          <Card.Content>
            <Alert aria-live="polite" role="status" status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Account created</Alert.Title>
                <Alert.Description>
                  We created an account for {registeredEmail}. You can now
                  sign in.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          </Card.Content>
        ) : (
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
                  minLength={8}
                  name="password"
                  type={isPasswordVisible ? "text" : "password"}
                  validate={(value) =>
                    value.length < 8
                      ? "Password must be at least 8 characters"
                      : null
                  }
                >
                  <Label>Password</Label>
                  <InputGroup variant="secondary">
                    <InputGroup.Input
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      type={isPasswordVisible ? "text" : "password"}
                    />
                    <InputGroup.Suffix className="pr-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => setIsPasswordVisible((visible) => !visible)}
                      >
                        {isPasswordVisible ? "Hide" : "Show"}
                      </Button>
                    </InputGroup.Suffix>
                  </InputGroup>
                  <Description>Use at least 8 characters.</Description>
                  <FieldError />
                </TextField>
              </div>
            </Card.Content>

            <Card.Footer className="mt-2">
              <Button className="w-full" isPending={isPending} type="submit">
                {isPending ? <Spinner color="current" size="sm" /> : null}
                {isPending ? "Creating account…" : "Create account"}
              </Button>
            </Card.Footer>
          </Form>
        )}
      </Card>
    </div>
  );
}
