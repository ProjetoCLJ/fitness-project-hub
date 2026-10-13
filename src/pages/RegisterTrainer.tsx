import { BasicSignup } from "@/components/auth/BasicSignup";

const RegisterTrainer = () => (
  <BasicSignup
    userType="trainer"
    roleLabel="Professor"
    subtitle="Informe seus dados básicos. Em seguida enviamos um e-mail para você criar sua senha e concluir o cadastro."
  />
);

export default RegisterTrainer;
