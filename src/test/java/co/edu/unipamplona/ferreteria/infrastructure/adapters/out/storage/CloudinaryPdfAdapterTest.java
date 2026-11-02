package co.edu.unipamplona.ferreteria.infrastructure.adapters.out.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.edu.unipamplona.ferreteria.application.exception.AlmacenamientoNoDisponibleException;
import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import java.io.IOException;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class CloudinaryPdfAdapterTest {

    private static final String URL = "https://res.cloudinary.com/rln6jzqz/image/upload/v1/ferreteria/facturas/FAC-2026-000001.pdf";

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void publicaElPdfConUnPublicIdEstableYDevuelveLaUrl() throws Exception {
        Cloudinary cloudinary = mock(Cloudinary.class);
        Uploader uploader = mock(Uploader.class);
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(Object.class), anyMap())).thenReturn(Map.of("secure_url", URL));

        CloudinaryPdfAdapter adapter = new CloudinaryPdfAdapter(cloudinary, null);

        String url = adapter.publicarFactura(new byte[]{1, 2, 3}, "FAC-2026-000001");

        assertEquals(URL, url);
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(uploader).upload(any(Object.class), captor.capture());
        assertEquals("ferreteria/facturas/FAC-2026-000001", captor.getValue().get("public_id"));
        assertEquals(true, captor.getValue().get("overwrite"));
        assertEquals(true, captor.getValue().get("invalidate"));
    }

    @Test
    void sinCloudinaryUrlLaPublicacionFallaDeFormaControlada() {
        CloudinaryPdfAdapter adapter = new CloudinaryPdfAdapter("", "", "");

        AlmacenamientoNoDisponibleException error = assertThrows(AlmacenamientoNoDisponibleException.class,
                () -> adapter.publicarFactura(new byte[]{1}, "FAC-2026-000001"));

        assertTrue(error.getMessage().contains("CLOUDINARY_URL"));
    }

    @Test
    @SuppressWarnings("rawtypes")
    void unErrorDeCloudinarySeTraduceAUnaExcepcionDeAplicacion() throws Exception {
        Cloudinary cloudinary = mock(Cloudinary.class);
        Uploader uploader = mock(Uploader.class);
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(Object.class), anyMap())).thenThrow(new IOException("sin red"));

        CloudinaryPdfAdapter adapter = new CloudinaryPdfAdapter(cloudinary, null);

        assertThrows(AlmacenamientoNoDisponibleException.class,
                () -> adapter.publicarFactura(new byte[]{1}, "FAC-2026-000001"));
    }

    @Test
    void unPdfVacioNoSePublica() {
        CloudinaryPdfAdapter adapter = new CloudinaryPdfAdapter(mock(Cloudinary.class), null);

        assertThrows(AlmacenamientoNoDisponibleException.class,
                () -> adapter.publicarFactura(new byte[0], "FAC-2026-000001"));
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void enModoUnsignedUsaElPresetSinPublicNiOverwrite() throws Exception {
        Cloudinary cloudinary = mock(Cloudinary.class);
        Uploader uploader = mock(Uploader.class);
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.unsignedUpload(any(Object.class), org.mockito.ArgumentMatchers.eq("ferreteria_preset"), anyMap()))
                .thenReturn(Map.of("secure_url", URL));

        CloudinaryPdfAdapter adapter = new CloudinaryPdfAdapter(cloudinary, "ferreteria_preset");

        String url = adapter.publicarFactura(new byte[]{1, 2, 3}, "FAC-2026-000001");

        assertEquals(URL, url);
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(uploader).unsignedUpload(any(Object.class), org.mockito.ArgumentMatchers.eq("ferreteria_preset"), captor.capture());
        assertTrue(captor.getValue().isEmpty(), "unsigned no debe enviar public_id ni overwrite");
    }
}
