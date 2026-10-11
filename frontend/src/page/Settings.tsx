import { useTranslation } from "react-i18next";

function Settings() {
    const { t } = useTranslation();
    return <div className="settings flex flex-col justify-center items-center gap-4 w-full h-full">
        <h1 className="text-4xl text-white font-bold">{t("settings.title")}</h1>
        <p className="text-lg text-gray-400">{t("settings.subtitle")}</p>
    </div>
}

export default Settings;