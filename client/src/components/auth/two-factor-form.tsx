import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { Verify2FA } from "@shared/schema";

const twoFactorSchema = z.object({
  token: z.string().length(6, { message: "Verification code must be 6 digits" }),
});

type TwoFactorFormValues = z.infer<typeof twoFactorSchema>;

export function TwoFactorForm() {
  const { t } = useLanguage();
  const { verify2FA } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);

  const form = useForm<TwoFactorFormValues>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      token: "",
    },
  });

  const onSubmit = async (data: TwoFactorFormValues) => {
    setIsVerifying(true);
    try {
      await verify2FA(data as Verify2FA);
    } catch (error) {
      console.error("2FA verification error:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">
              {t("verificationCode")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Enter the 6-digit verification code sent to your device
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="000000"
                        className="text-center text-lg tracking-widest"
                        maxLength={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isVerifying}>
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  t("verify")
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
