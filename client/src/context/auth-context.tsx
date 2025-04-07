import { createContext, ReactNode, useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, LoginUser, InsertUser, UpdateUser, UpdatePassword, Verify2FA } from "@shared/schema";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  is2FARequired: boolean;
  tempUserId: number | null;
  login: (data: LoginUser) => Promise<void>;
  register: (data: InsertUser) => Promise<void>;
  verify2FA: (data: Verify2FA) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateUser) => Promise<void>;
  updatePassword: (data: UpdatePassword) => Promise<void>;
  setup2FA: () => Promise<string>;
  disable2FA: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [is2FARequired, setIs2FARequired] = useState(false);
  const [tempUserId, setTempUserId] = useState<number | null>(null);

  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.requires2FA) {
        setIs2FARequired(true);
        setTempUserId(data.userId);
      } else {
        refetch();
        setIs2FARequired(false);
        setTempUserId(null);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Registration successful",
        description: "Your account has been created",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: async (data: Verify2FA) => {
      const res = await apiRequest("POST", "/api/verify-2fa", { ...data, userId: tempUserId });
      return await res.json();
    },
    onSuccess: () => {
      refetch();
      setIs2FARequired(false);
      setTempUserId(null);
      toast({
        title: "Authentication successful",
        description: "You have been logged in",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUser) => {
      const res = await apiRequest("PATCH", "/api/user", data);
      return await res.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: UpdatePassword) => {
      const res = await apiRequest("POST", "/api/user/change-password", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setup2FAMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/user/setup-2fa");
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "2FA setup",
        description: "Scan the QR code with your authenticator app",
      });
      return data.qrCodeUrl;
    },
    onError: (error: Error) => {
      toast({
        title: "Setup failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    },
  });

  const disable2FAMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/user/disable-2fa");
      return await res.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "2FA disabled",
        description: "Two-factor authentication has been disabled",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Disable failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const login = async (credentials: LoginUser) => {
    await loginMutation.mutateAsync(credentials);
  };

  const register = async (userData: InsertUser) => {
    await registerMutation.mutateAsync(userData);
  };

  const verify2FA = async (data: Verify2FA) => {
    await verify2FAMutation.mutateAsync(data);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const updateProfile = async (data: UpdateUser) => {
    await updateProfileMutation.mutateAsync(data);
  };

  const updatePassword = async (data: UpdatePassword) => {
    await updatePasswordMutation.mutateAsync(data);
  };

  const setup2FA = async () => {
    return await setup2FAMutation.mutateAsync();
  };

  const disable2FA = async () => {
    await disable2FAMutation.mutateAsync();
  };

  // Prefetch user data on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        is2FARequired,
        tempUserId,
        login,
        register,
        verify2FA,
        logout,
        updateProfile,
        updatePassword,
        setup2FA,
        disable2FA,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
