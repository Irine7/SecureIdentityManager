import { useLanguage } from "@/hooks/use-language";

export function Footer() {
  const { t } = useLanguage();
  
  return (
    <footer className="bg-white dark:bg-gray-800 shadow-inner mt-12">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("copyRight")}
            </p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
              <span className="sr-only">{t("privacyPolicy")}</span>
              {t("privacyPolicy")}
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
              <span className="sr-only">{t("termsOfService")}</span>
              {t("termsOfService")}
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
              <span className="sr-only">{t("contact")}</span>
              {t("contact")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
