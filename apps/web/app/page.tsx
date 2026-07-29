"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Button, Card, Spinner } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { ApiError, getMeetings, type Meeting } from "@/lib/api";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

function clearSession() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("authEmail");
}

type State =
  | { status: "loading" }
  | { status: "ready"; email: string; meetings: Meeting[] }
  | { status: "error"; email: string };

export default function Home() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const storedEmail = localStorage.getItem("authEmail");

    if (!token || !storedEmail) {
      router.replace("/auth/login");
      return;
    }

    getMeetings(token)
      .then((meetings) => {
        setState({ status: "ready", email: storedEmail, meetings });
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          clearSession();
          router.replace("/auth/login");
          return;
        }
        setState({ status: "error", email: storedEmail });
      });
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.replace("/auth/login");
  };

  if (state.status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-indigo-50 px-4 py-16 dark:from-black dark:via-zinc-950 dark:to-indigo-950/40">
        <Spinner size="lg" />
      </div>
    );
  }

  const { email, status } = state;
  const meetings = status === "ready" ? state.meetings : [];
  const lastThreeMeetings = [...meetings]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <div className="flex flex-1 justify-center bg-gradient-to-br from-zinc-50 via-white to-indigo-50 px-4 py-16 dark:from-black dark:via-zinc-950 dark:to-indigo-950/40">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
              Привет, {email}!
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Рады видеть вас снова.
            </p>
          </div>
          <Button variant="secondary" onPress={handleLogout}>
            Выйти
          </Button>
        </header>

        {status === "error" ? (
          <Alert aria-live="assertive" role="alert" status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Не удалось загрузить встречи.</Alert.Title>
              <Alert.Description>
                Проверьте соединение и обновите страницу.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : (
          <Card>
            <Card.Header>
              <Card.Title render={(props) => <h2 {...props} />}>
                Ваши встречи
              </Card.Title>
              <Card.Description>
                Всего запланировано: {meetings.length}
              </Card.Description>
            </Card.Header>

            <Card.Content>
              {lastThreeMeetings.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  У вас пока нет встреч.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {lastThreeMeetings.map((meeting) => (
                    <li
                      key={meeting.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-black dark:text-zinc-50">
                          {meeting.title}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {dateFormatter.format(new Date(meeting.date))}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                        {meeting.participants.length} участник(ов)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Content>

            <Card.Footer>
              <Link className={buttonVariants()} href="/meetings/new">
                Создать встречу
              </Link>
            </Card.Footer>
          </Card>
        )}
      </div>
    </div>
  );
}
