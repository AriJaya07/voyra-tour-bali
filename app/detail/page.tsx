import Container from "@/components/Container";
import AboutDetail from "@/components/DetailProduct/AboutDetail";
import BannerDetail from "@/components/DetailProduct/BannerDetail";
import BookingUser from "@/components/DetailProduct/BookingUser";
import ExcpectDetail from "@/components/DetailProduct/ExpectDetail";

export default function Detail() {
    return (
        <div className="">
            <BannerDetail />
            <Container>
                <AboutDetail />
                <BookingUser />
                <ExcpectDetail />
            </Container>
        </div>
    )
}