import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Lock, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required" }),
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(1, { message: "Confirm your password" }),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

const twoFactorVerifySchema = z.object({
  token: z.string().length(6, { message: "Verification code must be 6 digits" }),
});

type TwoFactorVerifyValues = z.infer<typeof twoFactorVerifySchema>;

export function SecuritySettings() {
  const { t } = useLanguage();
  const { user, updatePassword, setup2FA, disable2FA } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isOpen2FADialog, setIsOpen2FADialog] = useState(false);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const twoFactorVerifyForm = useForm<TwoFactorVerifyValues>({
    resolver: zodResolver(twoFactorVerifySchema),
    defaultValues: {
      token: "",
    },
  });

  const onSubmitPassword = async (values: PasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await updatePassword(values);
      passwordForm.reset();
    } catch (error) {
      console.error("Password update error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetup2FA = async () => {
    setIsSettingUp2FA(true);
    try {
      const qrUrl = await setup2FA();
      setQrCodeUrl(qrUrl);
      setIsOpen2FADialog(true);
    } catch (error) {
      console.error("2FA setup error:", error);
    } finally {
      setIsSettingUp2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      await disable2FA();
    } catch (error) {
      console.error("2FA disable error:", error);
    }
  };

  const onVerify2FA = async (values: TwoFactorVerifyValues) => {
    // Implementation for verifying 2FA setup
  };

  return (
    <div className="space-y-8">
      {/* Change Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Lock className="mr-2 h-5 w-5" />
            {t("updatePassword")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("currentPassword")}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("newPassword")}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("confirmNewPassword")}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="text-right">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("updating")}...
                    </>
                  ) : (
                    t("updatePassword")
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            {t("twoFactorAuth")}
          </CardTitle>
          <CardDescription>{t("twoFactorDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t("twoFactorStatus")}{" "}
                <span className={user?.is2FAEnabled ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                  {user?.is2FAEnabled ? t("enabled") : t("disabled")}
                </span>
              </p>
            </div>
            <Button
              variant={user?.is2FAEnabled ? "destructive" : "default"}
              size="sm"
              onClick={user?.is2FAEnabled ? handleDisable2FA : handleSetup2FA}
              disabled={isSettingUp2FA}
            >
              {isSettingUp2FA ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("loading")}...
                </>
              ) : (
                user?.is2FAEnabled ? t("disable") : t("enable")
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Dialog for 2FA Setup */}
      <Dialog open={isOpen2FADialog} onOpenChange={setIsOpen2FADialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("twoFactorAuth")}</DialogTitle>
            <DialogDescription>{t("scanQRCode")}</DialogDescription>
          </DialogHeader>
          
          {qrCodeUrl && (
            <div className="flex flex-col items-center py-4">
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="mb-4 border border-gray-200 dark:border-gray-700 rounded-md p-2" 
              />
              
              <Form {...twoFactorVerifyForm}>
                <form onSubmit={twoFactorVerifyForm.handleSubmit(onVerify2FA)} className="w-full space-y-4">
                  <FormField
                    control={twoFactorVerifyForm.control}
                    name="token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("enterCode")}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="000000" 
                            className="text-center tracking-widest" 
                            maxLength={6}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full">
                    {t("verifyAndEnable")}
                  </Button>
                </form>
              </Form>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen2FADialog(false)}>
              {t("cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
