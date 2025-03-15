import { Navigate, Outlet } from "react-router-dom"
import LocalStorageUtils from "./LocalStorageUtils";

const PrivateRoute = () => {
    return LocalStorageUtils.getToken() ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;