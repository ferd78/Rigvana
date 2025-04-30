import { Text, View, Pressable, TextInput} from "react-native";
import "../global.css";
import { Ionicons } from "@expo/vector-icons";
import InputField from "../components/InputField";
import LoginButton from "../components/LoginButton";
import { useNavigation } from "@react-navigation/native";
import { useState, useRef } from "react";

function Verification(){
    const nav = useNavigation();
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [otpError, setOtpError] = useState("");
    const expectedOtp = "1234"; //(change this so that it matches the backend)
    const inputRefs = [useRef(), useRef(), useRef(), useRef()];
    const handleVerify = () => {
        const enteredOtp = otp.join("");
      
        if (otp.includes("")) {
          setOtpError("Please complete the OTP!");
          return;
        }
      
        if (enteredOtp !== expectedOtp) {
          setOtpError("Incorrect OTP!");
          return;
        }
      
        setOtpError("");
        nav.navigate("SetNewPassword"); 
    };

    return (
        <View className="h-full bg-semiblack">
            <View className="flex-row items-center justify-center relative mt-14">
                <Pressable onPress={() => nav.navigate("ForgotPassword")} className="absolute left-10">
                    <Ionicons name="arrow-back" color={"white"} size={28} />
                </Pressable>
                <Text className="text-helvetica-bold text-white text-4xl">
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
                <LoginButton label="Verify" onPress={handleVerify}/> 
                {otpError !== "" && (
                    <Text className="text-red-500 text-sm mt-4">{otpError}</Text>
                )}
            </View>
        </View>
    );
}

export default Verification;