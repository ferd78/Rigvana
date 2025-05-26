import { Text, View, Pressable, TextInput } from "react-native";
import "../global.css";
import { Ionicons } from "@expo/vector-icons";
import LoginButton from "../components/LoginButton";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState, useRef } from "react";
import { NICO_URL, GLOBAL_URL } from "../ipconfig";
import { FELIX_URL } from "../ipconfig";

function Verification() {
    const nav = useNavigation();
    const route = useRoute();
    const { email } = route.params;

    const [otp, setOtp] = useState(["", "", "", ""]);
    const [otpError, setOtpError] = useState("");

    // Create a ref for each input
    const inputRefs = Array(4)
        .fill()
        .map(() => useRef(null));

    const handleVerify = async () => {
        const enteredOtp = otp.join("");

        if (otp.includes("")) {
            setOtpError("Please complete the OTP!");
            return;
        }

        try {
            const response = await fetch(`${GLOBAL_URL}/verify-otp`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ 
                    email: email.trim(),  // Ensure trimmed email
                    otp: enteredOtp 
                }),
            });

            const data = await response.json();
            
            if (!response.ok) {
                // More specific error handling
                let errorMsg = "Verification failed";
                if (response.status === 401) {
                    errorMsg = "Invalid OTP. Please try again.";
                    // Clear OTP fields on invalid attempt
                    setOtp(["", "", "", ""]);
                    inputRefs[0].current.focus();
                } else if (response.status === 400) {
                    errorMsg = data.detail || "OTP expired. Please request a new one.";
                }
                setOtpError(errorMsg);
                return;
            }

            // Successful verification
            setOtpError("");
            nav.navigate("SetNewPassword", { 
                email: email.trim(),
                otp: enteredOtp 
            });
            
        } catch (err) {
            console.error("Verification error:", err);
            setOtpError("Network error. Please check your connection.");
        }
    };

    return (
        <View className="h-full bg-semiblack">
            <View className="flex-row items-center justify-center relative mt-14">
                <Pressable onPress={() => nav.navigate("ForgotPassword")} className="absolute left-10">
                    <Ionicons name="arrow-back" color={"white"} size={28} />
                </Pressable>
                <Text className="text-helvetica-bold text-white text-3xl">
                    Verification
                </Text>
            </View>

            <View className="items-center pt-12">
                <Text className="text-helvetica text-white text-md">
                    Enter the verification code sent to your email:
                </Text>
                <View className="flex-row justify-center gap-4 mt-6">
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={inputRefs[index]}
                            value={digit}
                            maxLength={1}
                            keyboardType="numeric"
                            className="w-20 h-20 bg-neutral-700 text-white text-center rounded-xl text-xl"
                            onChangeText={(text) => {
                                const newOtp = [...otp];
                                newOtp[index] = text;
                                setOtp(newOtp);

                                if (text && index < otp.length - 1) {
                                    inputRefs[index + 1].current.focus();
                                }
                            }}
                            onKeyPress={({ nativeEvent }) => {
                                if (nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
                                    const newOtp = [...otp];
                                    newOtp[index - 1] = "";
                                    setOtp(newOtp);
                                    inputRefs[index - 1].current.focus();
                                }
                            }}
                        />
                    ))}
                </View>
                <LoginButton label="Verify" onPress={handleVerify} />
                {otpError !== "" && (
                    <Text className="text-red-500 text-sm mt-4">{otpError}</Text>
                )}
            </View>
        </View>
    );
}

export default Verification;
