import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { FaGoogle, FaGithub } from "react-icons/fa";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { LoginUser } from "@shared/schema";

type LoginFormProps = {
  onSuccess?: () => void;
  switchToRegister: () => void;
};

const loginSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({ onSuccess, switchToRegister }: LoginFormProps) {
  const { t } = useLanguage();
  const { login } = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: LoginFormValues) => {
    const loginData: LoginUser = {
      username: values.username,
      password: values.password,
    };

    try {
      await login(loginData);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("username")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("username")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("password")}</FormLabel>
                    <Button variant="link" className="p-0 h-auto font-normal text-xs">
                      {t("forgotPassword")}
                    </Button>
                  </div>
                  <FormControl>
                    <Input type="password" placeholder={t("password")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox 
                      checked={field.value} 
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">{t("rememberMe")}</FormLabel>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </div>
              ) : (
                t("login")
              )}
            </Button>
          </form>
        </Form>

        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              {t("or")}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="outline" type="button" className="w-full">
            <FaGoogle className="mr-2" />
            Google
          </Button>
          <Button variant="outline" type="button" className="w-full">
            <FaGithub className="mr-2" />
            GitHub
          </Button>
        </div>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {t("dontHaveAccount")}{" "}
          </span>
          <Button variant="link" className="p-0" onClick={switchToRegister}>
            {t("register")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
